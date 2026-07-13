# SHWL BUILD — Independent Adversarial Checker Report (round 1, SHA 29ebbf59)

> Independent adversarial checker (builder ≠ checker) for the SHWL build. Report = evidence. Committed verbatim.

**VERDICT: CLEAN — could not break; all 14 matrix rows genuinely enforced; ready for merge.**

Target confirmed: `git rev-parse HEAD` == `29ebbf591986d34b14e3cd2123d57ba60d2a4f67`. Checker edited nothing (worktree clean); no real `~/.cldh` was ever created; no `akior` path was written.

## Method
Read SPEC (`docs/lanes/shared-host-workload-lease.md`), `BUILD_REPORT.md`, and all 17 source modules + 14 selftests + `_testkit.mjs`/`_subprocess-child.mjs`. Ran the full suite, ran each SHWL selftest individually, then wrote independent attack scripts (scratchpad/OS-temp only), including real multi-process concurrency and real subprocesses, plus mutation testing on scratchpad COPIES to prove no test is vacuous.

## Evidence
1. **Tests pass and hit real code.** `npm test` → 76/76 GREEN (14 new SHWL). Matrix 14/14, adversarial 9/9, module selftests pass. Every selftest derives its root from `mkRoot()` (OS-temp, `guardHome()`-guarded); the lone `.cldh` reference is a read-only string assertion on `resolveRoot`, no write.
2. **Anti-gaming (mutation testing).** Removing each guarantee on a COPY makes its test FAIL: authorizes-always-true (rows 5/14), held-becomes-allow (rows 1/2/3), release-no-id-check (row 11), override-not-permanent (row 12), pid-reuse-ignored (row 9), orphan-becomes-no-lease, founder-recovery-no-auth, double-acquire-two-winners (row 6), expiry-auto-unlock (rows 7/8), stale-auto-unlock (row 7), prior-boot-trusted (row 10). All genuinely enforced.
3. **Capability never leaks.** `git grep` finds `shwlcap_`/`shwlsub_` only as the prefix constant — no committed value; no 64-hex secret in tracked files. Full lifecycle + `declareSubprocess` + override run: neither owner nor subprocess capability appears in `events.log`. Real subprocess receives the capability only via inherited fd 3 — its echoed argv/env contain neither. Ordinary same-project build never calls `declareSubprocess`, so never inherits (row 14). 0600 is not the inheritance mechanism (fd broker is). The leak scanner correctly excludes `lease.json` (the legitimate owner-only 0600 home per §3/§4.5).
4. **Attacks — all defended (independent scripts):** expiry-alone / stale-alone with a live owner → REFUSE, lock held, RECOVERY_REQUIRED; orphaned lock-dir, deleted lease, valid-JSON-but-schema-invalid tamper under a live lock → RECOVERY_REQUIRED (never "no lease"); PID reuse (real live pid, wrong marker) → not owner; prior-boot → BOOT_MISMATCH recovery (recorded, never silent); old owner / stale handle → LEASE_ID_MISMATCH_REFUSE_DELETE, successor survives; 40 real concurrent `acquireLock` → exactly 1 winner; forged same-length capability, short capability, subprocess-without-fd → refused; founder recovery with `authorized` = `1/"true"/"yes"/{}/[]` → refused (strict `=== true`); guard override with `founder` ≠ boolean true → does not override; §5.1 override → permanent `quiet_host_eligible=false` + append-only OVERRIDE event + attestation interval, idempotent, no restore export; preflight-race excluded by construction; §6 messages plain-English.
5. **§11 obligations addressed:** cross-platform host/boot/start-marker accessor (`identity.mjs`, env-injectable, fail-closed liveness); capability custody (`capability.mjs`); orphaned-lock test; override ergonomics (`attestation.mjs`+`messages.mjs`).

## What I could NOT break
Double-acquire (40-proc real race), expiry-alone, stale-alone, prior-boot trust, PID-reuse spoof, old-owner-deletes-successor, tamper/delete/orphan → no-lease downgrade, forged/short/absent capability, subprocess-without-capability, same-project capability inheritance, capability leak to argv/env/events.log/git, founder-recovery without explicit `=== true`, guard-override without `founder === true`, and QUIET_HOST restoration via any public API.

## Non-blocking observations (LOW — addressed in round 2)
- **OBS-1 (test hygiene):** the "EXPIRY ALONE / STALE ALONE" fixture was past both windows, so it didn't isolate the stale-alone guarantee (which is independently enforced + caught by `state-machine.selftest`). → split in round 2.
- **OBS-2 (disclosed-scope residual):** deleting the owner-only attestation file defaulted `isQuietHostEligible` back to `true` (same-user FS tampering, outside the cooperative-not-security model; the append-only `events.log` OVERRIDE record survives). → hardened in round 2 (reconstruct from `events.log`, fail-closed).

**CLEAN — ready for merge** (observations closed in round 2, SHA 5a9cea49).
