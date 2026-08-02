# Local Run History / Ledger
A local-only Run History panel lists this session's runs: source, objective, tests, decision (never
SHIP), exported yes/no, status (COMPLETE/HOLD/ERROR/UNKNOWN). Kept in memory for the session only;
reloading clears it (nothing faked or persisted as proof). No real-world action. Verified: records
runs, no SHIP decision, cleared on reload.
