# Refusal Execution Report (Correction D)
The refusal matrix now classifies every case and reports the counts separately:
- **Total cases: 41 — all held.**
- **EXECUTABLE_REFUSAL_PATH: 39** — each invokes a REAL enforcement function: `evaluateAppAction` (live-action gate), `validateInstallSpec` (fail-closed authority), `scanForSecrets` (secret guard), `replay` (fail-closed replay over prohibited runtime facts), `assertNotRealProof` (false-green guard), `validate` (semantic contract).
- **CATALOG_ONLY_POLICY_ASSERTION: 2** — pure policy statements with no distinct runtime enforcement path (e.g. "no customer/production support is ever claimed"; "no provider/Codex/deploy/billing/AKIOR/hardware in scope"). These are DISCLOSED as catalog, NOT counted as executed enforcement.
- The self-test asserts every executable case names a real enforcement function and that no case throws; executable + catalog = total (no double counting).
