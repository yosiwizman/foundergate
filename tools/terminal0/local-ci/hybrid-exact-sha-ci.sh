#!/usr/bin/env bash
# FounderGate Hybrid Local Exact-SHA CI Provider V1 — provider-neutral, no GitHub-hosted runner.
#
# Two mandatory layers bound to ONE exact-SHA source of the SAME repository tree:
#   Layer A (Mac full suite): the COMPLETE repository selftest suite on the founder-
#            controlled Mac Mini Pro, from a disposable git worktree at the exact SHA
#            (macOS host + git/procps/sysctl present -> host-coupled infra tests execute).
#   Layer B (Docker portable): the PR-relevant PORTABLE tests inside a network-DISABLED,
#            read-only-rootfs, no-secret, no-mount container, from the SAME exact-SHA git
#            archive extracted into tmpfs.
#
# A PASS requires BOTH layers to pass. No GitHub billing/runner is used. Usage:
#   hybrid-exact-sha-ci.sh <repo> <full-40hex-sha> <docker-portable-cmd> <evidence-dir>
# The exact acquired SHA is verified against the request; the tree fingerprint is
# recorded and re-verified; the container runs with --network none and no host secrets.
set -uo pipefail
REPO="$1"; SHA="$2"; PORTABLE_CMD="$3"; EVID="$4"; IMG="${FG_LOCALCI_IMAGE:-node:20-bookworm-slim}"
case "$SHA" in *[!0-9a-f]* | "" ) echo "REFUSED: not a full hex SHA"; exit 2;; esac
[ ${#SHA} -eq 40 ] || { echo "REFUSED: SHA must be 40 hex chars (no branch names / short SHAs)"; exit 2; }
[ -z "$(git -C "$REPO" status --porcelain)" ] || { echo "REFUSED: source repo dirty"; exit 2; }
git -C "$REPO" rev-parse -q --verify "$SHA^{commit}" >/dev/null || { echo "SOURCE_MISMATCH: SHA not found"; exit 3; }
TREE=$(git -C "$REPO" rev-parse "$SHA^{tree}")
mkdir -p "$EVID"; TMP="$(mktemp -d)"; ARC="$TMP/src.tar"
# canonical exact-SHA archive (read-only git op)
git -C "$REPO" archive --format=tar --output="$ARC" "$SHA"
ARC_SHA=$(shasum -a 256 "$ARC" | cut -d' ' -f1)
# ---- Layer A: Mac full suite from a disposable worktree (git-enabled) ----
WT="$TMP/mac"; git -C "$REPO" worktree add --detach "$WT" "$SHA" >/dev/null 2>&1
[ "$(git -C "$WT" rev-parse HEAD^{tree})" = "$TREE" ] || { echo "SOURCE_MISMATCH: worktree tree != requested"; exit 3; }
( cd "$WT" && node scripts/run-selftests.mjs ) > "$EVID/mac.log" 2>&1; MAC_RC=$?
MAC_LINE=$(grep -E 'ALL GREEN|RED:' "$EVID/mac.log" | tail -1)
# ---- Layer B: Docker portable, same archive, network-disabled, no secrets/mounts ----
cat "$ARC" | docker run -i --rm --network none --read-only --tmpfs /work:exec --tmpfs /tmp -w /work "$IMG" \
  sh -c "tar -xf - ; $PORTABLE_CMD" > "$EVID/docker.log" 2>&1; DOCK_RC=$?
# ---- fingerprint re-verification + teardown ----
TREE_AFTER=$(git -C "$REPO" rev-parse "$SHA^{tree}")
git -C "$REPO" worktree remove --force "$WT" >/dev/null 2>&1
DOCK_OK=$(grep -c 'PORTABLE_RESULT pass=[0-9]* fail=0' "$EVID/docker.log")
VERDICT=HYBRID_LOCAL_CI_FAIL
if [ "$TREE" != "$TREE_AFTER" ]; then VERDICT=HYBRID_LOCAL_CI_SOURCE_MISMATCH
elif [ $MAC_RC -eq 0 ] && [ $DOCK_RC -eq 0 ] && [ "$DOCK_OK" -ge 1 ] && echo "$MAC_LINE" | grep -q 'ALL GREEN'; then VERDICT=HYBRID_LOCAL_CI_PASS; fi
rm -rf "$TMP"
printf 'requested_sha=%s\nacquired_tree=%s\narchive_sha256=%s\nmac_rc=%s\nmac=%s\ndocker_rc=%s\nimage=%s\nverdict=%s\n' \
  "$SHA" "$TREE" "$ARC_SHA" "$MAC_RC" "$MAC_LINE" "$DOCK_RC" "$IMG" "$VERDICT" | tee "$EVID/summary.txt"
[ "$VERDICT" = HYBRID_LOCAL_CI_PASS ]
