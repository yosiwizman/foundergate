# PAT Revocation / Expiry / Disable Model (W6)
A fine-grained PAT is revoked in account settings or by expiry (not by a repo-scoped API delete). Model (proven 7/7):
- absent token → `TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED`;
- present but not clearly this proof's disposable sandbox PAT → `PAT_REVOCATION_REQUIRES_FOUNDER_MANUAL_ACTION` (**never auto-revoke an ambiguous token**);
- present + clearly disposable + mechanical revocation confirmed → `PAT_REVOKED_AND_POST_REVOCATION_DENIED`;
- present + expiry recorded → `PAT_EXPIRY_RECORDED_REVOCATION_NOT_PROVEN`.
Current run: **token present, sandbox intake proven; founder-set 7-day expiry; FounderGate does NOT auto-revoke (did not create it) -> PAT_REVOCATION_REQUIRES_FOUNDER_MANUAL_ACTION.**
