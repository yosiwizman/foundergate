# Lane D — Aggregated Multi-Run Batch Evidence
`src/batch_evidence/batch-core.mjs` keeps a SERVER-OWNED buffer filled from REAL fixture executions,
then seals ONE genuine aggregate ZIP (`ditto`) containing BATCH_SUMMARY.json + BATCH_REPORT.md with:
batch summary, each fixture checked, objective, adapter result, decision, limitations, what was not
proven, individual run summaries, and the aggregate conclusion. Verified with `unzip -t` before
returning SEALED. This is a true aggregate (every run), NOT a latest-run re-export. Endpoint:
`POST /api/batch-export`. Verified live: 8 entries, unzip_ok true, integrity OK; E2E aggregate +
viewer replay. Status when empty: UNKNOWN (no fake aggregate).
