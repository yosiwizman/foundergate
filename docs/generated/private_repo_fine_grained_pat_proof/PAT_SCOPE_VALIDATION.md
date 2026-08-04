# PAT Scope & Identity Validation (N2) — rerun

**Label: `HOLD_PAT_SCOPE_UNSAFE_OR_AMBIGUOUS`.**

| Check | Result |
| --- | --- |
| `GET /user` | 200 — authenticates as yosiwizman |
| Classic OAuth scopes | none (confirmed fine-grained) |
| `GET /repos/.../sandbox` | **404 — no access to the sandbox repo** |
| `GET /repos/.../sandbox/contents` | 404 |
| `GET /user/repos` | 200 — **100+ repositories** across multiple owners |
| Sandbox in token-visible set | **No** |

**Interpretation:** the token cannot read the intended sandbox (404) yet its visibility is broad/ambiguous (100+ repos). This is not the narrow, single-repo, read-only PAT the gate requires, so FounderGate holds and performs no intake. **No non-sandbox repository contents were fetched.**
