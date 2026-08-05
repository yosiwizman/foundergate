# Independent Checker Report — Night Factory Safe-Verifier Correction
**Reviewer:** independent read-only Checker (`a696b619f4efbb8b6`). **Evaluated SHA:** `a59f2847…` (parent = origin/main).
**Verdict: CLEAN_WITH_LIMITS.**

- FINDING 1 (RCE) FIXED — I built a checksum-consistent capsule whose packaged `evil.selftest.mjs` writes a /tmp marker if executed; the verifier processed it with **no marker written, no host execution**. `--run-selftests` REFUSED (exit 2); `--inspect-selftests` → PACKAGED_TESTS_PRESENT_NOT_EXECUTED. Hunted for other execution paths (.test.mjs/import/require/eval/Function/preinstall/payload node_modules) — none; only `zipinfo`/`unzip` run on the archive as data.
- FINDING 2 FIXED — inventory walks the whole payload (not only repo_intake).
- Archive attacks: all 6 rejected (../ / absolute / symlink / duplicate seal / duplicate sidecar / duplicate inner). Adversarial 18/18; base 10/10.
- Honest multi-status confirmed (archive_integrity / manifest_consistency / evidence_seal_consistency / status_authentication=STATUS_NOT_AUTHENTICATED / packaged_test_execution=NOT_EXECUTED / trusted_candidate_binding=TRUSTED_GIT_BINDING_NOT_VERIFIED) — not collapsed to a product PASS.
- Withdrawal + re-scan honest — exhaustion WITHDRAWN (prior evidence preserved); my own word-boundary grep independently confirms genuine skipped tests = 0 (naive xit( matched only exit()); route family ABSENT on origin/main; 117 branches BUILT_BUT_NOT_INTEGRATED.
- Isolation/safety: only tools/evidence + tests/tools + docs/generated/night_factory_correction changed; origin/main == 65fd01669f80; PR #200 OPEN; no PR; no secret; tool read-only.

**Phase 13 — missed eligible WIDE_SAFE tasks (corroborates the honest non-exhaustion position):** (1) trusted-git-binding verifier (check evaluated_sha vs local repo + reviewer docs); (2) route-integration matrix generator; (3) genuine-skip/disabled-test classifier (word-boundary, reusable in CI); (4) capsule structure conformance linter for new capsules. All local, no founder gate, no rework of sealed candidates.

**CHECKER_VERDICT: CLEAN_WITH_LIMITS**
