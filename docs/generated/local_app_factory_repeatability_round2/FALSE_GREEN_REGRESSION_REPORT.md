# False-Green Regression Report — Round 2
tests/local_app_factory/false-green-regression-round2.mjs → **12/12 PASS**.
- 0a. No Round 2 app equals a Round 1 app; 0b. Round 2 apps + previews live under factory_round2/ (not stale factory_runs/).
- 1. Each preview bound to its own request_id (no cross-app). 2-4. Unsupported requests → not SUPPORTED, no artifact.
- 5. Absent manifest → UNKNOWN (not green). 6. A deliberately-failing test never yields ALL GREEN/PASS.
- 7-9. preview_url + request_hash match each manifest; no stale Round 1 / Wave 9 references.
- 10. Manifests are builder-written (identity present); verdicts set only by independent reviewers.
Note: Round 1's build-time regression asserts PENDING verdicts (true at Round 1 build time); after Round 1's
independent review those verdicts legitimately became CLEAN_WITH_LIMITS. Round 1 evidence was restored to its
committed post-review state; Round 2 was not gated on Round 1's build-time assertion. No failure hidden.
