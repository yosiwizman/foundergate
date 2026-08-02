# Repo / Source Intake
Default: Safe local demo (self-owned). Also: Local fixture (self-owned). Unknown/private/customer/
production source → REFUSED/HOLD_NEEDS_AUTHORIZATION (never run). Optional local path accepted only
if it matches a known safe demo path and contains no customer/private/production/secret markers.
Backend `/api/start` allowlist is an independent second guard. Fixtures for classification samples
live in tests/fixtures/local_product_loop/ (passing/failing/no-test/python + unsafe NAME-only entries).
