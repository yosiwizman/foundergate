# Lane 1 soak-driver harvest — Independent Adversarial Checker Report

> Independent adversarial checker (builder ≠ checker) for the harvested `src/tools/soak-driver.mjs`. Report = evidence. Committed verbatim.

**VERDICT: CLEAN — could not break; ready for merge.**

Target confirmed: branch `lane1-soak-driver-harvest` @ `442bc03c657f82aca3d499d8392c83d744a2fc50`; diff vs base `bf7c905` = exactly 3 new files, 0 modifications (`src/tools/soak-driver.mjs`, `src/tools/soak-driver.selftest.mjs`, `docs/assembly-evidence/soak-driver-harvest/BUILD_REPORT.md`). Selftest 17/17 green. Independent attack suite (scratchpad temp roots only): all repelled.

## What I could NOT break
1. **Verdict integrity (priority).** The gate is a single expression `accumulatorPassed === true && quietEligible === true && drift.ok === true` and the ONLY source of `isPass:true`. Passing accumulator + lost QUIET_HOST → NOT-PASSED; passing accumulator + drift → NOT-PASSED; truthy-but-not-`true` smuggling on each leg (`1`/`"yes"`) forced NOT-PASSED by strict `=== true`; NOT-PASSED text never emits a bare gate-pass token; refusal + fatal catch both hard-return `isPass:false` (no alternate PASS exit); QUIET_HOST loss double-guarded and the §5.1 downgrade is permanent (reconstructable), cannot be restored.
2. **Run-1 lessons.** (a) drift recheck detects CONTENT_CHANGED/ADDED/REMOVED/MODE_CHANGED + moved git HEAD, fails closed on exception; (b) process matcher excludes self/descendants/ancestors/`sh -c` yet flags a genuine second soak / heavy foreign build — could not sneak a real second soak past it; benign own child not flagged; (c) refusal paths release cleanly (caffeinate-not-held refuses before acquisition; preflight-not-quiet → PREFLIGHT_FAIL writes RELEASED + drops the lock); (d) TTL explicit, must strictly exceed the span (equal rejected).
3. **Caffeinate verification.** `verifyCaffeine` read-only, honors only self/ancestor/descendant holders, fails closed; an unrelated caffeinate pid → `held:false`; caffeinate is NEVER spawned (only `ps -Ao`, `git rev-parse/status`, and `spawn("node", soak-run.mjs)` present). Caffeinate is outside the verdict AND-gate — a fooled detector can only make a run stricter, never massage a PASS.
4. **Parameterization.** Non-40-hex/short/phantom SHA, non-finite/≤0 claim hours, TTL ≤ span, missing dir/purpose/repo all rejected (`validateOptions` collects all errors).
5. **Boundaries + anti-gaming.** Zero changes to any accepted module (`src/shwl`, `src/freeze-manifest`, `src/run-attestation`, `src/environment-provenance`, `src/quiet-host-monitor`, `src/tools/reliability-soak.mjs`) or `src/v8b*`; no `akior` path in code; no real `~/.cldh`/caffeinate touched; tests use OS-temp roots with a guard refusing any `~/.cldh` path; each of the 17 selftests genuinely exercises its guarantee.

## Minor observations (NOT findings; none permit a NOT-PASSED→PASS massage, orphaned lock, or spawned caffeinate)
- `verifyCaffeine` matches a `caffeinate` process in the tree but does not parse its assertion **flags** (an ancestor `caffeinate -i` would register as held). Mitigated: an ancestor `caffeinate <cmd>` wrapper asserts for the driver's lifetime, and caffeinate is outside the verdict gate.
- The `sh -c` wrapper exclusion means CPU burned directly inside a `sh -c` process isn't flagged by the signature matcher (documented; host saturation is independently caught at preflight via `load1 >= ncpu`).
- `SECOND_SOAK` regex stops at `|`/`;` (a piped/compound argv won't match) — but that form only appears in excluded shell argv; the real node worker row is pipe-free and IS flagged.

All three are documented intentional tradeoffs and do not weaken the verdict AND-gate. **Findings to close before merge: none. Recommend merge.**
