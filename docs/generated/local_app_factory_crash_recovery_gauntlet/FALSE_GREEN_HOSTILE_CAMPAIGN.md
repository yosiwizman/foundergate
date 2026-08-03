# False-Green Hostile Campaign (Lane G) — 10/10
1-2. Builder cannot mark fixture CLEAN / write Checker verdict — manifests carry PENDING verdicts.
3. PASS cannot appear without a passing test — F05 → HOLD_TEST_FAILURE.
4. DONE/preview cannot appear without artifacts — F06/F11 missing artifact → HOLD.
5. Preview cannot open when manifest invalid — F03 → no preview.
6. Preview cannot open wrong app — F04 → HOLD_PREVIEW_MISMATCH (blocked at inject).
7-8. Stale Round 1 / Round 2 evidence cannot mark clean — F07/F08 → HOLD_STALE_EVIDENCE.
9. No broken fixture shown green/UI-ready — anyGreenOnBroken=false.
10. Corrupted content vs recorded checksum blocks acceptance — F12 → HOLD_POST_CHECKER_MUTATION.
11. Post-checker mutation invalidates verdict — content hash differs from recorded checker_content_hash.
