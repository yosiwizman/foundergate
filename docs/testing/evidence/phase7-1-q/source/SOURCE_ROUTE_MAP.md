# UI Version Binding (Lane A)

| Artifact | Path | Classification |
|---|---|---|
| Canonical founder UI (neutral-first) | src/founder_url_drop/ui/safety.{html,css,js} | CANONICAL |
| Canonical server | src/safety_check/service.mjs (canonical identity: foundergate-safety-check / phase7.1-neutral-first-v1) | CANONICAL |
| Launcher (identity-safe) | tools/macos/{launch-foundergate-safety-check.sh,resolve-node.sh,foundergate-safety-check-launcher.applescript} | CANONICAL |
| Evidence Pack generator | src/safety_check/evidence-pack.mjs | CANONICAL |
| Prior real run evidence | docs/assembly-evidence/SAFETY_CHECK/sc-0bc1b04f/ | HISTORICAL_EVIDENCE |
| Headed qualification capture | docs/testing/evidence/phase7-1-q/headed/ | INTERNAL_TEST_ONLY (evidence) |

There is ONE canonical founder-launchable interface: the neutral-first `safety.html` served at `/`.
No prepopulated-result UI is reachable via the launcher, `/`, an alternate active route, a stale
process (canonical identity fail-closed), another worktree (repo_id mismatch → UNKNOWN_SERVICE), or a
service worker (SERVICE_WORKER: NONE). No older prepopulated-result UI exists in this tree as a
launchable route; any historical UI is HISTORICAL_EVIDENCE / SUPERSEDED / NOT_FOUNDER_LAUNCHABLE.
