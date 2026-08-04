# PAT Authority & Scope Model (W1)
Defines credential types (fine-grained PAT · classic PAT · deploy key · GitHub App · broad gh auth) and scopes (repo-scoped-read-only · write-scoped · org-wide · workflow-capable · unknown/ambiguous). **Rules enforced in code + tests (13/13):**
- classic PAT → **REFUSED** for this proof;
- broad gh auth → **REFUSED** for intake;
- deploy key → **REFUSED** for the PAT proof;
- GitHub App → not this proof;
- fine-grained PAT is **ACCEPTED_READONLY** only when repo-scoped read-only **and** the target is exactly the sandbox repo; write/org-wide/workflow → REFUSED; unknown → HOLD; non-sandbox target → REFUSED.
