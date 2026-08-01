# Lane Ownership Map (strict — no shared file ownership)
| Lane | Owns paths |
|------|-----------|
| A Public Demo Cleanup | publish_candidates/self_owned_demo_repo/, docs/generated/public_demo_cleanup/ |
| B Cross-Account Proof Prep | docs/generated/cross_account_proof/, tests/cross_account_proof/, fixtures/cross_account_proof/ |
| C Founder No-Terminal UX | demo/founder_operator_dashboard/, docs/generated/founder_no_terminal_ux/, tests/founder_no_terminal_ux/, playwright-founder-operator.config.mjs |
| D Reviewer Expanded View | demo/reviewer_console/, docs/generated/reviewer_view/, tests/reviewer_view/ |
| E Beta Spine Map | docs/generated/beta_spine/, .foundergate/runs/max_wide_autonomous_build_20260801T1630ET/beta_spine/ |
| F Repeatability/Crash | docs/generated/repeatability_crash_tests/, tests/repeatability_crash_tests/, fixtures/repeatability_crash_tests/ |
| G Investor Evidence | docs/generated/investor_evidence/, demo/investor_evidence/ |
| H SaaS Foundation | docs/generated/saas_foundation/, demo/saas_foundation_shell/, tests/saas_foundation_shell/ |
| T0 Integration | docs/generated/max_wide_build/ (governance + reports) |

**Note:** Lane A does NOT edit the live demo/self_owned_public_demo_target/ (that is the audited target); it builds a separate cleaned candidate under publish_candidates/ to avoid shared-file conflict with the audit record. Lanes C and D both reference src/evidence_viewer/ conceptually but neither writes it in this run (prototypes are self-contained under demo/); Terminal-0 confirms no shared-file writes.
