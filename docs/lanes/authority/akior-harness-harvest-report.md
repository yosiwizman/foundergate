# AKIOR → FounderGate — harness harvest report (verbatim)

> **Provenance:** committed verbatim by the FounderGate CTO at the founder's instruction, as the AUTHORITY for the
> AKIOR-HARVEST bundle (§28). Authored by the founder's **separate read-only Terminal Advisor lane**, surveying the
> AKIOR repo (`~/Projects/akior-activepieces-engine`) from disk/git only — nothing written or executed in either
> repo. Read-only evidence. Reproduced exactly as supplied. Live test/CI execution is UNKNOWN in that lane.

---

AKIOR → FOUNDERGATE — HARNESS HARVEST REPORT (read-only survey)

Provenance: founder's separate read-only Terminal Advisor lane, surveying the AKIOR repo (~/Projects/akior-activepieces-engine) from disk/git only. Nothing was written or executed; this is a survey, not an adoption — nothing changes in either repo. Every claim cites an on-disk evidence path. Live test/CI execution is UNKNOWN in this lane (exec/network blocked); "PROOF" cites committed evidence, selftest counts recorded in docs, defects caught, and SHAs/timestamps in the run records.

Scoped to deltas — I omit what FounderGate already has (gated stages, one-builder+one-checker, merge-sheriff/branch-protection, exact-SHA CI, AUTHORITY-column ledgers, phantom-report protection, visual-self-review, stranger-test/anti-repeat, fixture write-protection, critical-path gate, honest-duration/soak-proof law, calm-color/plain-language laws).

Top 10, ranked by value-per-adoption-cost

1 · DISPOSABLE-ACCOUNT RATE-LIMITER / INTERRUPTION AUTO-RECOVERY
- What: Per-account min-interval throttle + daily cap + exponential back-off on a 429/lock/auth-challenge signal, then lock-and-pause ("an account lock is recoverable DATA, not a goal" — never retry-storm; waits for unlock()).
- Where: scripts/_lib/akior-disposable-rate-limiter.mjs; doctrine in docs/status/HARNESS_STRESS_LOG.md §W5.
- Proof: Built 2A.496 in response to a quantified stress-log limit; recorded 20/0 selftest; every autonomous external drive gates canProceed→op→record.
- Portability: Generic (any harness driving rate-limited external services). Risk: Low — fail-safe pauses; needs per-account state persistence.

2 · SESSION-TOKEN MINT/USE/REVOKE + LIVE-SERVICE --preflight (incl. boot-id publish-after-listen fix)
- What: Founder mints a short-lived, boot-bound, revocable on-disk session; a --preflight CLI cross-checks engagement against the live serving process (8-value reason enum) before any live write; revoke at end.
- Where: scripts/akior-session-local-action-token.mjs, scripts/_lib/akior-session-token-store.mjs; evidence docs/status/AKIOR_SESSION_BOOTID_LISTEN_PUBLISH_FIX_EVIDENCE.md, AKIOR_SESSION_TOKEN_GATE_CARD.md.
- Proof: Caught a real infra defect — an importing process clobbered service-boot-id.json, so a witness bound to a dead boot-id failed live while file-based --status still read VALID (PR #414 root-cause fix: publish only from the listen() owner + /__version live cross-check; boot-id selftest 18/0 + static 11/0). First live write witnessed then reversed (AKIOR_SESSION_TOKEN_FIRST_LIVE_WRITE_WITNESS_ADDENDUM.md).
- Portability: Generic pattern (any harness gating live writes behind a founder ceremony). Risk: Moderate — needs a serving process + file/in-memory truth reconciliation.

3 · ROLLBACK-SNAPSHOT RECOVERY DRILL + FAIL-CLOSED rollbackFromBackup
- What: Backup-before-write of the touched stores + a manifest-driven, fail-closed rollback (NO_BACKUP_MANIFEST/INCOMPLETE_RESTORE/ROLLBACK_ERROR all do zero writes) + a SAFE-verified approved-rollback script with a pre-restore safety backup.
- Where: scripts/_lib/akior-local-action-live-executor.mjs (backupLiveStores/rollbackFromBackup), scripts/akior-restore.sh; drill evidence evidence/resilience/restore-demo.transcript.txt.
- Proof: Hermetic backup→mutate→rollback byte-restore selftest (akior-echo-local-action-undo.selftest.mjs H1); the catastrophic empty/wrong-dir case proven to delete nothing; used to restore exact net-zero after a live witness (docs/status/AKIOR_TASK_FULL_FRONT_UI_PRE_FOUNDER_WITNESS.md).
- Portability: Pattern + code. Risk: Low — freshness window + snapshot discipline must be honored.

4 · SINGLE-SANCTIONED-EXECUTOR + WRITE-INTENT CONTAINMENT (Option C) — as a PATTERN
- What: Every visible-surface mutation routes through one gated writer; a central isLocalWriteIntent guard at the top of the inbound handler blocks all write paths (memory hook, capability spine, confirm-commit) unless a session authorizes.
- Where: scripts/_lib/akior-local-action-live-executor.mjs, scripts/_lib/akior-inbound-loop.mjs; docs/status/AKIOR_OPTION_C_CONTAINMENT_PROOF_AND_ROUTE_MAP.md, ledger AKIOR_TECHNICAL_DEBT_LEDGER.md D-001/D-005.
- Proof: Two independent-checker refutation passes found and closed real "second write-doors" (the "remember X" memory hook, the capability spine, and a read-armed→confirm-commit seam) before merge (PR #399); akior-option-c-chat-write-authority.selftest.mjs.
- Portability: Generic pattern (audit every write path down to one authority). Risk: Moderate — requires exhaustively enumerating write paths.

5 · MULTI-DAY RELIABILITY SOAK ACCUMULATOR
- What: Folds many health-sample windows over wall-clock into a single rolling aggregate + SLO verdict — the tool that, left running, produces the "daily reliability" evidence a soak-proof law demands.
- Where: scripts/_lib/akior-reliability-soak.mjs (v2A.479) + .selftest.mjs, on akior-reliability-harness.mjs.
- Proof: Pure accumulator (no network/time); selftest committed; complements the real continuous-run record docs/status/AKIOR_OPTION_A_247_ENDURANCE_REPORT.md (2h24m continuous, 28 commits, SHAs+UTC timestamps 2026-07-06, honest-duration verdict).
- Portability: Generic (gives FG's soak-proof law an actual rolling tool). Risk: Low — needs a runner feeding windows+timestamps.

6 · HARNESS STRESS LOG — a deliberate "run the harness to breakage" program
- What: A redline log that quantifies exactly where the build/CI/automation harness wedges, saturates, or leaks under rapid parallel work — breakage treated as DATA.
- Where: docs/status/HARNESS_STRESS_LOG.md.
- Proof: Real defects caught (dated 2026-06-14/15, with SHAs): a secret-shaped .copy file dodging *paste.sh gitignore (B4, neutralized); an openclaw shell-quoting bug caught only at live-fire because hermetic mocks masked the CLI contract (fixed 2A.481, 40/0); CI serialization + no-concurrency-group (W1/B1); 196 worktrees / 50 stale (B3).
- Portability: Generic practice (+ the lesson "hermetic mocks mask shell/CLI-contract bugs; live drives expose them"). Risk: None — it's a log/practice.

7 · FRONT-UI WITNESS FAIL-CLOSED DETECTORS (delta over visual-self-review)
- What: Machine detectors that reject substitution: no-headed-workflow, API-only proof, headless-only proof, missing-screenshot-stage, screenshot-not-visually-reviewed, founder-route-substitution, false-success, net-zero-closeout — fail-closed on absent evidence.
- Where: scripts/_lib/akior-front-ui-witness-detectors.mjs; standard docs/contracts/AKIOR_FULL_FRONT_UI_PRE_FOUNDER_WITNESS_STANDARD.md.
- Proof: Caught a false-success the automated suite missed — undo reported "removed that task" on a zero-change no-op (beforeHash==afterHash) while "19/20 layout tests passed" (AKIOR_TASK_FULL_FRONT_UI_PRE_FOUNDER_WITNESS.md).
- Portability: Generic — FG has the visual-self-review law; this adds the fail-closed anti-substitution + false-success + net-zero detectors. Risk: Low.

8 · CROSS-PROCESS ATOMIC-STORE LOCK (withFileLockSync)
- What: Serializes concurrent writes to shared JSON stores so a daemon/UI/test can't produce a torn read or lost update; used to take stable pre-write snapshots.
- Where: scripts/_lib/akior-atomic-store.mjs (consumed by the executor's backup + mutate path).
- Proof: The executor holds this lock across before-read + mutate + undo-capture so the undo descriptor can't go stale (Copilot concurrency fix, cited in akior-local-action-live-executor.mjs).
- Portability: Generic (any file-backed store with >1 writer). Risk: Low — lock-timeout handling required.

9 · CI-CONCURRENCY COALESCING + WORKTREE HYGIENE + SECRET-SHAPED-FILE GITIGNORE HARDENING
- What: Operational fixes the stress program surfaced: add a concurrency:{group,cancel-in-progress} group; prune stale git worktrees; gitignore *.copy/cycle-* so secret-shaped files can't be swept in by a reflexive git add -A.
- Where: docs/status/HARNESS_STRESS_LOG.md (B1/B3/B4); the "never git add -A" doctrine is enforced by AKIOR's stop guards.
- Proof: B1 quantified (50 success / 5 cancelled / 3 failure over ~60 runs, no supersession); B4 the concrete secret-leak-class near-miss.
- Portability: Generic ops. Risk: Very low.

10 · WIDE READ-ONLY AUDITOR FAN-OUT (scales the checker doctrine)
- What: Run N independent read-only auditors in parallel (blind to each other) over the same change, then synthesize — many perspectives without a second writer.
- Where: pattern recorded in docs/status/HARNESS_STRESS_LOG.md ("6-wide parallel read-only auditor fan-out: SUSTAINED cleanly").
- Proof: 6 agents returned 63–119s, no queue failures/deaths; the subagent concurrency cap absorbed 6-wide read-only work (probe point: untested above 6).
- Portability: Generic pattern (extends FG's one-checker doctrine to parallel audit). Risk: Low — cost/token scaling; keep it read-only.

Honest notes

- Strongest single artifact to copy first: HARNESS_STRESS_LOG.md (#6) — near-zero cost, and it already names real defect classes (secret-shaped-file, shell-quoting-under-mocks) that any harness can hit.
- Highest genuine-delta value: the rate-limiter (#1) and the session-token/boot-id ceremony (#2) — the task named these as likely gaps, and both are self-contained with committed proof + a caught defect.
- Overlap flags (not double-counting FG): #7 overlaps FG's visual-self-review but adds anti-substitution/false-success detectors; #10 overlaps FG's one-checker doctrine but scales it; #2's --preflight/critical-path idea is adjacent to FG's mechanical critical-path gate (the delta is the live-service cross-check + 8-value enum).
- What I could NOT verify (UNKNOWN): live execution / current green of any selftest count cited (exec blocked), and whether each module is still at the version in its header — the CTO should re-run selftests before adopting. Evidence paths above are the audit trail.

This report is read-only evidence; I wrote nothing and executed nothing. No repo changed.
