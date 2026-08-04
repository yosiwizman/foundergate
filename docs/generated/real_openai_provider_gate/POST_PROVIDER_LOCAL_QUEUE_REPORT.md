# Post-Provider Local Queue Report (NO additional real calls)

All scenarios are local dry-run/simulation. Zero further real provider calls. all_pass=**true** · no_real_call=**true**

| ID | Scenario | Observed | Held/OK |
| --- | --- | --- | :---: |
| A | second-call refusal replay | REFUSED_SECOND_PROVIDER_CALL | ✅ |
| B | missing-key replay | HOLD_PROVIDER_CREDENTIAL_MISSING | ✅ |
| C | cost-cap replay | REFUSED_COST_CAP | ✅ |
| D1 | private-data input refused | REFUSED_PRIVATE_DATA | ✅ |
| D2 | source-code input refused | REFUSED_SOURCE_CODE_PAYLOAD | ✅ |
| D3 | secret-like input refused | REFUSED_PRIVATE_DATA | ✅ |
| E | provider-error replay (no auto-retry) | NO_RETRY_HOLD | ✅ |
| F | malformed-response replay | PROVIDER_RESPONSE_UNEXPECTED | ✅ |
| G | evidence replay from state (deterministic, no AI reasoning) | REPLAY_MATCHES_STATE | ✅ |
| H | claim blocker (no forbidden readiness claim) | NO_OVERCLAIM | ✅ |
