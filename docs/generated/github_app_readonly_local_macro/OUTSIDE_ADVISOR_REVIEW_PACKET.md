# Outside-Advisor Review Packet — GitHub App Read-Only Local Macro

## Scope
Local-only preparation of the GitHub App read-only route for the founder-owned sandbox. No live app/install/token; no existing/customer repo; no provider; no merge.

## Independently checkable
- Self-tests: authority 13/13 · secret-guard 11/11 · simulator 8/8 · contract 7/7 · refusal 34/34 · replay 6/6.
- WRITE_AND_ABUSE_REFUSAL_RESULTS.json — 34/34 all_held.
- GITHUB_APP_LOCAL_MACRO_EVIDENCE.json — mode local_simulation, github_app_proven:false, all live/secret flags false; replay REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY.
- github_app_readonly_index.json — status LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS; not_proven list explicit.
- screenshots/ — 8 headed-proof images.

## Adversarial questions answered
1. **Could the simulator be mistaken for a real proof?** No — fake non-`ghs_` token, is_real:false, local-simulation labels; any real-proof claim → HOLD_FALSE_GREEN; replay never upgrades sim → live.
2. **Any secret handled?** No real key/token exists or is ingested; the guard fails closed on any secret pattern; only redacted fingerprints permitted.
3. **Any live GitHub action?** No — every live action is gated (TRUE_FOUNDER_GATE); no signature exists (N1); nothing was created/installed/tokenized.
4. **Overclaim?** No — GitHub App is never "proven"; UI + CLAIMS forbid it.

## What live proof needs
A separate six-lock founder signature (see NEXT_TRUE_FOUNDER_GATE_REGISTER, gate A).
