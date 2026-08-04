# PAT Scope & Identity Validation (N2) — new token

**Label: `PAT_INTAKE_VERIFIED_SCOPE_PARTIAL`** (read-only intake works; scope not independently verifiable).

| Check | Result |
| --- | --- |
| Fingerprint vs old failed token | **changed** (fgpat_99a4a9b8dd970464 ≠ fgpat_46a4db8921b7ccdd) |
| `GET /user` | 200 — yosiwizman, fine-grained (no classic scopes) |
| `GET /repos/.../sandbox` | **200** (private: YES, default: main) |
| Repo `permissions` object | admin/push=true — **owner-role artifact, NOT token scope** |
| Read-only scope independently verified | **No** — GitHub doesn't expose fine-grained PAT scope via read API; no write attempted (forbidden) |

**Interpretation:** the token now grants sandbox access and read-only intake succeeds; the read-only *scope* is asserted by the founder's token config but cannot be independently proven without a forbidden write, so the honest label is scope-partial.
