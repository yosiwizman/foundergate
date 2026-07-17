# Independent Adversarial Checker Report — VB2 ClassifiedObjectStore

**Branch:** `lane-a-vb2-build` @ `827b790` · **Base main:** `068276e`. Checker ≠ author; read-only (verified against a git-object export of 827b790).

## 1. Spec conformance — every MUST — PASS
- IDs: `^q[0-9a-f]{32}$` (128-bit); `newId=idFromBytes(randomBytes(16))`; 1000 mints distinct; non-16-byte rejected.
- Hash + canonical JSON: SHA-256 over sorted-key/whitespace-free JSON; order-independent; NaN/Infinity rejected; snapshot content-addressed (reorder→same id, byte-change→different).
- QueueEvent chain: genesis 64 zeros; good→intact; partial tamper→broken-at-e1; tamper+rehash→broken-at-e2; full same-actor rewrite→intact = the DISCLOSED residual (matches L2; external anchor pins the head).
- Lifecycle↔status: all 6 map; DISMISSED/EXPIRED distinct+first-class; bare done→UNKNOWN (never guessed); statusForLifecycle exact inverse; bare transition→EXPIRED ignored (only via retire-expired); illegal RESOLVED→PENDING ignored.
- Classification fail-closed: rejects SECRET/BLOCKED/UNKNOWN, 48-bit legacy id, missing class, null, array; accepts PUBLIC/INTERNAL.

## 2. Fake-done shortcuts — mutation testing — PASS (non-vacuous)
Store selftest (15) baseline green; **9/9 mutations flipped it RED** (verifyChain→always intact; expired→resolved; validateObject→always valid; bare-done→guessed; bare transition→EXPIRED; canonicalize no-sort; accept NaN; idFromBytes no length guard; newId constant). D1 #12: chain/lifecycle proofs assert real recomputed hashes + folded state, not a boolean/ok proxy.

## 3. Schema / fail-closed — PASS
appendEvent throws on missing at/kind/non-object/bad store; validateObject {valid:false} on non-object/array/forbidden-class/malformed-id. No silent acceptance.

## 4. No act/approve/execute path — PASS
Only import node:crypto. Extended no-act-edge (11 checks) scans the store; **6/6 sneak attempts caught RED** (executeApproval export, node:fs, hidden fetch(), randomBytes moved out of newId, process.exit, child_process). No fs/net/child_process/exec/exit surface.

## 5. Suite — PASS
Store 15 + no-act-edge 11 green in isolation. Full suite 84/84 in the live repo (the single git-archive-export failure is evidence-integrity's `git cat-file` needing `.git`; unrelated to v8b2, byte-identical file).

## Findings
Non-blocking observations only: O1 event_hash preimage (previous_hash appended once, still hash-bound + linkage-checked — tamper detection intact); O2 key-sort UTF-16 vs spec's "UTF-8 code-point" prose (matches RFC 8785/JCS; differs only for astral keys); O3 pin the soak/CI tree to the exact build SHA. None require code change.

## FINAL VERDICT: CLEAN
