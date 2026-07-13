# L1 freeze-manifest — Independent Adversarial Checker Report (round 1, SHA 47c78863)

> Independent adversarial checker (builder ≠ checker). Report = evidence. Committed verbatim.

**VERDICT: CLEAN — could not break the core integrity guarantee; ready for merge.** No undetected drift of frozen regular-file bytes, and no manifest whose recorded `manifest_hash` verifies while its hashed identity fields lie. Four LOW/non-blocking advisories (A1–A4), all CLOSED in round 2 (SHA d674644f).

## Isolation
Diff = exactly 5 in-scope files; `src/shwl/**`, other lanes, ledgers, `akior` untouched. Imports `node:crypto`+`node:fs`(read/stat)+`node:path`; no `child_process`/network; no `Date.now`/`new Date` (only a comment).

## What I could NOT break (round 1)
Byte modification / same-length edit → MODIFIED; delete → MISSING; add regular → ADDED; file→symlink → MISSING+ADDED; file→dir → MISSING+ADDED; path-case rename → MISSING+ADDED; manifest forgery of hashed fields (sha256/git_sha/schema_version) without re-hash → `manifest_tampered` fail-closed; `manifest_hash` binds schema_version+git_sha+every {path,sha256,bytes}; `created_at` excluded from the hash AND never read in the diff (safe); internally-consistent re-hashed lie → caught on disk as MODIFIED; duplicate-entry trick → still MODIFIED; traversal path → MISSING (no read escaped root); fail-closed on non-object/null/array/missing-field/unknown-schema/unreadable; determinism (same bytes → identical manifest_hash). Anti-gaming: neutering the ADDED loop / hash-recompute / MODIFIED sha-bytes check / MISSING push each fails a shipped selftest.

## Advisory findings (LOW / non-blocking) — CLOSED in round 2
- **A1** file mode/permission not fingerprinted (chmod +x on unchanged bytes verified ok). → round 2 records `st.mode & 0o777` in canonicalString + verify diff.
- **A2** a symlink added after freeze not flagged as ADDED (`enumerateFiles` only emitted regulars). → round 2 flags non-regular entries as `UNEXPECTED`.
- **A3** `verifyFreezeManifest` had no expected-hash anchor param (a wholesale re-freeze of a tampered tree self-verifies ok). → round 2 adds `expectedManifestHash` fail-closed.
- **A4** per-entry structural validation under-tested. → round 2 pins malformed-entry cases.
