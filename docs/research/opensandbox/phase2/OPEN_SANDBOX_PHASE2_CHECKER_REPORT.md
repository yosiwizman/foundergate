# OpenSandbox Phase 2 — Independent Checker Report (bounded runtime spike)

## Role & independence statement
I am the **independent checker** for the OpenSandbox Phase-2 bounded runtime spike. I did **not** perform the spike; I verified durable evidence adversarially and **strictly read-only**. During this review I did **not** modify FounderGate `main`, did not merge, did not contact any M1 host or its soak, did not touch AKIOR, did not start any server, did not create any sandbox, and did not run `docker run` / `opensandbox-server` / `curl` against a server. The **only** file I created is this report. All commands used were read-only (`git status/log/rev-parse`, `ls`, `cat` of evidence, `shasum -a 256`, `docker images`/`docker ps -a --format`/`docker network ls`, `pgrep`, `lsof`, `grep -c`) plus the Read tool.

- **Checked at (host clock):** 2026-07-17.
- **Evidence root:** `/tmp/foundergate-opensandbox-phase2-runtime/evidence/`
- **Trivial repo:** `/tmp/foundergate-opensandbox-phase2-trivial-repo/`
- **Spike worktree (branch `spike/opensandbox-phase2`, HEAD `e58632b5…`):** `/Users/yosiwizman/Projects/foundergate-wt-opensandbox-phase2/`
- **FounderGate main worktree:** `/Users/yosiwizman/Projects/foundergate` (HEAD `e1ca1989…`)

---

## Verifications (≥25; each pass/fail + command or artifact)

| # | Check | Command / Artifact | Result |
|---|-------|--------------------|--------|
| V1 | Main HEAD == pinned `e1ca1989…` | `git -C /Users/yosiwizman/Projects/foundergate rev-parse HEAD` → `e1ca1989d2397297a450893f7890dbe7fc21e494` | **PASS** |
| V2 | Main working tree clean | `git -C …/foundergate status --porcelain` → empty | **PASS** |
| V3 | Host sentinel ABSENT (checked twice) | `ls …/foundergate/OPEN_SANDBOX_FORBIDDEN_WRITE_SENTINEL.txt` → "No such file or directory" (both runs) | **PASS** |
| V4 | `container-inspect.txt` shows `Mounts=[]` | evidence `container-inspect.txt` line 8 | **PASS** |
| V5 | Worktree branch/HEAD match pin | `git rev-parse --abbrev-ref HEAD` → `spike/opensandbox-phase2`; `rev-parse HEAD` → `e58632b582c8fe8d59c206afe7d8caefb8f13cf1` (PR#151 base pin) | **PASS** |
| V6 | Worktree porcelain within allowed files only | `git status --porcelain -uall` → lane doc + `COMMAND_TRANSCRIPT.md`, `RESULT.md`, `RUNTIME_EVIDENCE.json` only | **PASS** (CHECKER_REPORT + DECISION_PACKET absent — see Note A) |
| V7 | `docker ps -a` = 17 containers, none a spike sandbox | `docker ps -a --format '{{.Names}}'` → 17 names (akior*, open-webui, ai_company_*, supabase_*) | **PASS** |
| V8 | No container named `sandbox-07d8778e` / `sandbox-e1fa2e91` / `sandbox-egress` / `opensandbox` / `3d40e270` | `docker ps -a --format '{{.Names}}' \| grep -Ei …` → no match (exit 1) | **PASS** |
| V9 | Networks back to baseline (5) | `docker network ls` → bridge, docker_default, host, none, supabase_network_open-cuak-db (5) | **PASS** |
| V10 | Baseline files corroborate counts | `baseline-containers.txt`=17 lines, `baseline-networks.txt`=5 lines == current | **PASS** |
| V11 | No `opensandbox-server` process | `pgrep -fl opensandbox-server` → exit 1 (empty) | **PASS** |
| V12 | Port 8090 has no listener | `lsof -nP -iTCP:8090 -sTCP:LISTEN` → exit 1 (empty); 8091 also empty | **PASS** |
| V13 | README digest == preupload | independent `shasum -a 256` → `6ca386e0…` == `preupload_digests.README.md` | **PASS** |
| V14 | input.txt digest == preupload | `65da4a84…` == recorded | **PASS** |
| V15 | builder.sh digest == preupload | `accad72f…` == recorded | **PASS** |
| V16 | In-sandbox digests == preupload | `execd-result.json` `insandbox_digests.stdout` all three == preupload | **PASS** |
| V17 | Exported result digest (independent) == in-sandbox result | `shasum -a 256 exported-result.txt` → `68c15306…` == `result_sha256_insandbox` | **PASS** |
| V18 | Exported content correct | `cat exported-result.txt` → `FOUNDERGATE_OPENSANDBOX_PHASE2_BUILDER_OK` | **PASS** |
| V19 | Workload image present | `docker images --digests` → `python:3.11-slim sha256:db3ff2e1…` | **PASS** |
| V20 | execd image present | `opensandbox/execd:v1.0.21` (local digest `sha256:1dc98c7d…`) | **PASS** (see Note B) |
| V21 | egress image present w/ pinned digest | `opensandbox/egress:v1.1.4 sha256:973130e01bf76e8e…` == pin | **PASS** |
| V22 | Docker socket ABSENT inside workload | `execd-result.json` `docker_socket.stdout` → "No such file or directory … SOCKET_ABSENT" | **PASS** |
| V23 | Egress mode `dns+nft`, default deny | `egress-result.json` mode/defaultAction; `egress-sidecar.log` lines 10,16 | **PASS** |
| V24 | example.com allowed (200) | `egress-result.json` `T1_example_com: ALLOWED_STATUS 200` | **PASS** |
| V25 | example.org denied (DNS NXDOMAIN) | `T2_example_org_https: DENIED` | **PASS** |
| V26 | direct-IP 1.1.1.1:443 denied (nft drop) | `T3_direct_ip_1.1.1.1_443: DENIED (TimeoutError — nft IP-layer drop)` | **PASS** |
| V27 | nft `table inet opensandbox` chain `egress` `policy drop` | `egress-nftables.txt` lines 19,54–55 (`type filter hook output priority filter; policy drop`) + final `drop` line 67 | **PASS** |
| V28 | RESULT does NOT call egress "proven secure" | `RESULT.md` §PROVEN bullet: "behaved as observed … classified EGRESS-STRICT-BEHAVIOR-CONFIRMED-IN-SPIKE"; no "proven secure" string | **PASS** |
| V29 | No adoption/merge/security/microVM claim; runc labeled honestly | `RESULT.md` header + §NOT PROVEN; `RUNTIME_EVIDENCE.json` F1 + `secure_runtime: NOT configured` | **PASS** |
| V30 | RESULT lists F1–F7 incl. F3 (0.0.0.0 published ports) | `RESULT.md` §OBSERVED LIMITATIONS 1–7; F3 = HostIp 0.0.0.0 | **PASS** |
| V31 | container-inspect PortBindings corroborate F3 | `container-inspect.txt` line 9 → `HostIp:"0.0.0.0"` on both published ports | **PASS** |
| V32 | Host-boundary artifact self-consistent | `host-boundary-verification.json` → `host_sentinel_present:false`, `main_head:e1ca1989…`, `container_mounts:[]` | **PASS** |
| V33 | Independent teardown corroboration (not builder narration) | `server-egress.stdout.log` tail → `DELETE …/07d8778e-… 204` then `GET …/07d8778e-… 404` | **PASS** |
| V34 | Workload has no NET_ADMIN; sidecar has it | `egress-result.json` `workload_has_NET_ADMIN:false`, `sidecar_has_NET_ADMIN:true`; `container-inspect` CapDrop includes NET_ADMIN | **PASS** |
| V35 | Lane doc lists exactly six allowed files | `OPEN_SANDBOX_PHASE2_RUNTIME_SPIKE_LANE.md` §Allowed files → 6 entries | **PASS** |
| V36 | Spike sandbox IDs match keystone-4 targets | `active-sandbox-id.txt`=`e1fa2e91-…`, `egress-sandbox-id.txt`=`07d8778e-…` — both confirmed gone in V7/V8 | **PASS** |

**36 verifications, 36 PASS, 0 FAIL.**

---

## Adversarial falsification attempts on the five keystones

**K1 — HOST-BOUNDARY.** *Attempt to falsify:* look for the host sentinel, a dirty `main`, a moved HEAD, or a non-empty Mounts. Result: host sentinel ABSENT on two independent `ls` runs (V3); `main` porcelain empty and HEAD `e1ca1989…` (V1–V2); `container-inspect.txt Mounts=[]` (V4) corroborated by `RUNTIME_EVIDENCE.json` and `host-boundary-verification.json`. The `execd-result.json` `boundary_attempt` step *does* show an in-sandbox write `wrote_rc=0` to the same absolute path — but with `Mounts=[]` (zero bind mounts) and the host file absent, this is provably **container-local** and cannot reach the host. Honestly disclosed as such in all three docs. **NOT FALSIFIED.**

**K2 — DOCKER-SOCKET.** *Attempt:* find `/var/run/docker.sock` inside the workload or a socket bind mount. Result: `SOCKET_ABSENT` inside (V22) and `Mounts=[]` (V4). `host.docker.internal` resolves to a DNS alias only (IPv6 `fdc4:…::254`), which is not a socket or Docker API — correctly labeled in evidence. Server retained Docker control-plane authority; it was never handed to the workload. **NOT FALSIFIED.**

**K3 — EGRESS.** *Attempt:* find an allowed non-allowlisted host, a direct-IP bypass, a chain not set to drop, or an overclaim of "secure". Result: mode `dns+nft` + default deny (V23); example.com 200 (V24); example.org denied NXDOMAIN (V25); 1.1.1.1:443 denied via nft drop (V26); `table inet opensandbox` chain `egress` `policy drop` with a terminal `drop` (V27). RESULT labels this **behavior-confirmed-in-spike**, not "proven secure" (V28). **NOT FALSIFIED.**

**K4 — TEARDOWN.** *Attempt:* find a lingering sandbox container/network/process/listener. Result: independent `docker ps -a` = 17 (== baseline), no name contains `sandbox-07d8778e` / `sandbox-e1fa2e91` / `sandbox-egress` / `opensandbox` / the container id `3d40e270` (V7–V8); networks = 5 (V9); `pgrep opensandbox-server` empty (V11); `lsof :8090`/`:8091` empty (V12); server access log independently shows DELETE→204 / GET→404 for the egress sandbox (V33). **NOT FALSIFIED.**

**K5 — VERSION/DIGEST INTEGRITY.** *Attempt:* recompute all digests independently and find a mismatch. Result: independent `shasum -a 256` of the three repo files equals `preupload_digests` (README `6ca386e0…`, input `65da4a84…`, builder `accad72f…`) (V13–V15); in-sandbox digests equal these (V16); independently-computed exported-result sha256 `68c15306…` equals the in-sandbox result digest (V17); `docker images` lists `python@sha256:db3ff2e1…`, `opensandbox/execd:v1.0.21`, and `opensandbox/egress@sha256:973130e0…` (V19–V21). **NOT FALSIFIED.**

All five keystones survived falsification.

---

## Findings

No CONTRADICTIONS and no material overclaim were found. Two non-blocking notes (INFO):

- **Note A (INFO).** The worktree currently has only 4 of the 6 lane-allowed files present (lane doc + 3 phase-2 research docs). `OPEN_SANDBOX_PHASE2_CHECKER_REPORT.md` (this file, now created) and `docs/status/OPEN_SANDBOX_PHASE2_DECISION_PACKET.md` were absent at review time. This is expected/allowed — the checker report is authored in this pass and the decision packet is a downstream artifact. All present files are within the six-file allowlist; nothing out-of-lane was written.
- **Note B (INFO).** `opensandbox/execd` is pinned by **tag** (`v1.0.21`), not by digest, in the lane doc and RESULT — whereas the workload and egress images are digest-pinned. This is consistent with lane rule 17 ("record any unpinned limitation"): `RUNTIME_EVIDENCE.json` records the execd build git sha (`34653f7a…`); the actual local image digest observed is `sha256:1dc98c7d…`. Not a contradiction; recorded for completeness.

Neither note affects any keystone.

---

## Assessment
All five keystones verify against durable artifacts, most with independent recomputation (digests, `docker ps -a`, `pgrep`, `lsof`) rather than builder narration alone. Teardown is corroborated by an independent server access log. Claim labeling is honest: runc/standard-container isolation is stated plainly, egress is scoped to behavior-confirmed-in-spike, and no adoption/merge/security/microVM claim is made. No overclaim, no contradiction, no out-of-lane write.

## VERDICT: CHECKER-CLEAN
