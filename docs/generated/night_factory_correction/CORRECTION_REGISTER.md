# Correction Register — Night Factory Safe-Verifier Correction

## Withdrawn status
The prior Full Local Night Factory status **`AUTHORIZED_MACRO_QUEUE_EXHAUSTED_WITH_FULL_PROGRAM_PROOF` is WITHDRAWN and NOT ACCEPTED.** Replacement status: **`NIGHT_FACTORY_EXHAUSTION_NOT_PROVEN`** until a new complete mechanically-supported full-program proof establishes otherwise. The prior evidence package is PRESERVED (not deleted/rewritten) as an honest insufficient run.

## Confirmed findings (independently proven; reproduced here)
1. **UNSAFE HOST CODE EXECUTION (CAPSULE_VERIFIER_HOLD_CORRECTABLE).** `verify_capsule.mjs --run-selftests` executed `.selftest.mjs` code extracted from a capsule directly via the host `node` process (confirmed at line 130: `execFileSync('node',[t],...)`). A checksum-consistent capsule's packaged code could run on the host and the tool still returned PASS. Capsule integrity ≠ trusted code.
2. **VERIFIER FAILS ITS OWN PACKAGE.** The tool searched only paths containing `repo_intake` (confirmed at line 127), so the night package's own tests under `tests/tools` were never found → `--run-selftests` on the night capsule would report 0 tests / FAIL. The "self-verifies with packaged tests" claim was FALSE (the earlier dogfood run was structure-only, without `--run-selftests`).
3. **FULL-PROGRAM EXHAUSTION NOT PROVEN.** ~72 skipped/disabled tests were dismissed without individual mechanical classification; separate-branch route capabilities were labeled `ALREADY_PROVEN_CURRENT` — but separate-branch proof is NOT current integrated-product proof. No fresh integrated evidence for launch / founder journey / mission→lane / Builder execution / progress / pause+stop / recovery / browser / accessibility / current route integration.
4. **MISSING MACRO-RUN EVIDENCE.** lane contracts, event ledger, action transcript, resource/heartbeat, durable-supervisor evidence, recovery execution, integration manifest, browser+accessibility proof, complete skipped-test inventory, MACRO_QUEUE.json, BACKLOG_DISCOVERY.json.

## No live/external action occurred in the prior run or this correction.
