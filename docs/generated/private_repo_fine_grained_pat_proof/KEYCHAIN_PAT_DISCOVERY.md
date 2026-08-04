# Keychain PAT Discovery (N1)
- Service: `foundergate-github-fgpat-sandbox-readonly` · Account: `yosiwizman/foundergate-private-readonly-sandbox-20260804T0105ET`.
- `security find-generic-password` (attributes-only, NO `-w`/`-g`) → **exit 44 (item not found)**, both with the exact account and service-only.
- **Result: token_present = FALSE.** No token value was requested, retrieved, printed, or written to disk.
- Per the token rule: FounderGate does **not** ask the founder to paste a token. It proceeds with all local readiness/model/UI/gate work and stops at `TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED`.
