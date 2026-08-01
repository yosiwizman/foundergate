# Scan Report — Local-Operator Session
## Session-scoped (this run's new files) — clean
- Secret: 0 · external-action: 0 · external network refs (non-loopback): 0 · out-of-path: 0 · provider/spend/contact/publish/deploy: 0.
- The server uses execFile array-args (no shell); the browser uses same-origin fetch of /api (loopback), no external hosts.
## Repo-wide scan flags — verified BENIGN (pre-existing product files, not this session)
- secret=3: the product's OWN test fixtures (src/environment-provenance/capture.selftest.mjs, src/v8a3/filecabinet/no-secret-leak.selftest.mjs) use DUMMY truncated "BEGIN RSA PRIVATE KEY" strings to TEST leak detection. Fake, not real keys.
- external-action=4: src/collectors/github/github-collector.mjs GUARD logic that REFUSES mutating gh verbs (read-only allowlist) + comments. No mutation executed.
- forbidden-claim=3: a product test fixture ("this IS production-ready" // must be rejected) + this session's own FORBIDDEN-claim LISTS (prose enumerating banned phrases). No positive claim.
Conclusion: no real secret, external action, or forbidden claim introduced by this session.
