# Lane Ownership Map
| Lane | Owner | Paths |
|------|-------|-------|
| Sensitive runtime | Terminal-0 (single writer) | src/operator_console/, src/live_run_console/, src/evidence_viewer/, demo/founder_operator_dashboard/launcher* |
| A Founder Witness UI | T0 | docs/generated/cto_aligned_macro_run/ (witness docs) |
| B AKIOR local prep | T0 | docs/generated/cto_aligned_macro_run/AKIOR_* + fixtures/cto_aligned_macro_run/ |
| C CLDH OS | T0 | docs/generated/cto_aligned_macro_run/CLDH_* |
| D Reviewer drawer | T0 | demo/reviewer_console/, tests/reviewer_view/ |
| E Public demo | T0 | publish_candidates/self_owned_demo_repo/, docs |
| F Repeatability/soak | T0 | tests/founder_no_terminal_ux/, tests/repeatability_crash_tests/ |
| G Beta/PR map | T0 | docs/generated/cto_aligned_macro_run/BETA_*/PR* |
| H Investor/SaaS | T0 | docs/generated/cto_aligned_macro_run/INVESTOR_*/SAAS_* |
No two lanes share a file. Terminal-0 integrates all.
