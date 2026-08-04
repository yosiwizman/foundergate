# Keychain-Only Loader (W2)
The loader retrieves a PAT from the macOS Keychain into **process memory only** and returns **only** safe metadata + a redacted deterministic fingerprint (`fgpat_<16 hex>`). Proven in tests (7/7):
- token never prints, never returns in any caller-visible field, never writes to evidence/screenshots/ZIP;
- the callback receives the token **in memory** (used, not exposed); the raw value is absent from the returned object;
- missing token → controlled `TOKEN_ABSENT_HOLD`; malformed token → `TOKEN_MALFORMED_HOLD` (no fingerprint);
- token-like text is never emitted, so a secret scan cannot find a value.
