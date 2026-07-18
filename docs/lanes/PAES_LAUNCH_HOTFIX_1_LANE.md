# PAES-LAUNCH-HOTFIX-1 Lane Contract

- Objective: fix the CommonJS-in-ESM defect in the real run-creation entrypoint (require() under Node v24) + add a regression test that EXECUTES the real entrypoint.
- Exact base: 8e3bc0995aa802cd2db16f2b3e533dc553dbe714
- Allowed files: tools/terminal0/paes/create-wave2-run.mjs, src/activation-path/*.selftest.mjs (new regression), .foundergate/recovery/failed-launches.jsonl, docs/lanes + docs/status, DCL directive dir.
- Forbidden files: any other src/ or tools/ product/launcher/recovery/governance behavior; frozen product paths.
- Risk: narrow-sensitive activation-path fix.
- Tests: node --check + EXECUTE create-wave2-run.mjs in isolated state root + mutations.
- Rollback: revert single commit.
- Merge handoff: Terminal-0 via ARLC.
