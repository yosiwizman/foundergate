# Command transcript — VB2 rerun (host preflight → launch → final seal)

Disk-first record; RUN_LEDGER.jsonl is the authoritative append-only log. This transcript summarizes the
operator actions; exact machine facts live in the JSON artifacts.

## Preflight
- Host proof: hostname/sysctl hw.model/machdep.cpu.brand_string/uname -m/hw.memsize/sw_vers → qual-host-m1, Apple M1.
- Repo resolve: git rev-parse --show-toplevel; git remote get-url origin; git ls-remote origin refs/heads/main (read-only).
- Cleanliness: pgrep for prior driver/soak/sentinel/caffeinate (none); lease.json RELEASED; no lock; no collisions.

## Isolated run
- git worktree add --detach <WT> b9af1def… ; verified detached HEAD == SHA, clean.
- Evidence dir + disk-first artifacts (RUN_INTENT, RUN_LEDGER, RUN_RECOVERY_STATE), env/quiet-host preflight.
- Rehearsal A (quiet-host detector) + B (classified object store) → both PASS (rehearsal-result.json).
- freeze-manifest-begin.json (340 files, 098b428f…).
- Git freeze begin. caffeinate -dimsu node src/tools/soak-driver.mjs --sha … --claim 8 --interval 900 --ttl 36000 --host qual-host-m1 --purpose "…" --evidence <rel> --repo <WT> --probe "node <EV>/integrated-probe.mjs".
- Independent sentinel (300s) launched.

## Final seal (read-only until all checks pass)
- Resumed from disk; recovery FINAL_SEAL_IN_PROGRESS.
- Generated freeze-manifest-end.json, lease-events.log, attestation-chain.jsonl, attestation-verification.json.
- Ran 18-check seal (seal-report.json) → ALL PASS. Attestation: correct anchor intact / wrong anchor broken-anchor.
- Artifact index + hashes; RESULT-ONEPAGE. Then evidence-only branch create/commit/push (no merge, no sign).
