# L1 freeze-manifest — Independent Adversarial Checker Report (round 2, SHA d674644f)

> Same independent checker, delta re-review after the A1–A4 fixes. Report = evidence. Committed verbatim.

**VERDICT: CLEAN — A1–A4 closed, no regression; ready for merge.** Three advisory (non-blocking) test-suite-strength notes below; none is a live defect (code independently confirmed correct for each).

HEAD confirmed `d674644f17763fc66ffa0f755c6c4404f649dad0`; diff = 5 in-scope files; no `shwl`/other-lane/ledger/`akior`. Selftests green: build-verify 12 + drift-tamper 19 = 31 checks.

## Advisory closure (re-verified against the code + independent attacks)
- **A1 (mode fingerprint) — CLOSED.** `st.mode & 0o777` in `canonicalString` (part of `manifest_hash`) + verify diff. `chmod +x` on unchanged bytes → MODIFIED; no-op chmod → zero drift; `chmod 0o777` → MODIFIED; determinism preserved; two entries differing only in mode → different hashes; flip `entry.mode` without re-hash → `manifest_tampered`.
- **A2 (non-regular injection) — CLOSED.** `enumerateTree` lstat-classifies symlink → `nonRegular` before dir/file branches. Symlink added → `{reason:UNEXPECTED, nonRegular:true}`; regular→symlink → MISSING+UNEXPECTED; symlink-to-directory-of-code → UNEXPECTED, NOT traversed (no subtree smuggling); build refuses a non-regular listed path via `!st.isFile()`.
- **A3 (verify-time anchor) — CLOSED.** `verifyFreezeManifest(m,{root,expectedManifestHash})` refuses inside the fail-closed path: wholesale re-freeze of a tampered tree with the honest anchor → `ok:false, manifest_tampered:true, hash_mismatch:true`; matching anchor on a clean tree → ok; wrong-type/wrong-value anchors all refused.
- **A4 (per-entry validation) — CLOSED.** Validation covers path/sha256/bytes/mode; a malformed entry (incl. a rehashed out-of-range mode) → `manifest_tampered:true`.

## No regression
16/16 independent attacks held; `manifest_hash` binds schema+git_sha+every entry (path/sha256/bytes/mode); un-rehashed tamper → tampered; internally-consistent forgery caught on disk; determinism intact; `created_at` still excluded/never-read. Mutation testing: dropping the verify mode-diff / the UNEXPECTED loop / the symlink classification / the A3 anchor refusal each fails a shipped selftest.

## Advisory (non-blocking) — TEST-STRENGTH only, no code defect (tracked follow-ups)
The code is correct for all three (independently confirmed); these are forward-regression test-pins, not live vulnerabilities:
1. **Mode's membership in `manifest_hash` (identity half of A1) is not pinned by a shipped test** (only the verify disk-diff half is). A future edit dropping `mode` from `canonicalString` while keeping the disk-diff would let an exec-bit flip preserve the honest `manifest_hash` + pass the A3 anchor with no test failing. Suggested pin: flip `entries[i].mode` without re-hashing → assert `manifest_tampered:true`.
2. **A2 "build refuses non-regular listed path" passes for the wrong reason on macOS** (symlinks to `/etc/hostname` which is absent here → refusal via the unreadable-path branch, not `!st.isFile()`). Pins correctly on Linux CI. Suggest symlinking to a readable in-temp target.
3. **A4 mode entry-validation is redundantly masked** (the test mutates mode without re-hashing, so the hash-recompute catches it regardless). The validation is real defense-in-depth; just not isolated by the test.

**CTO disposition:** the code is adversarially-verified correct and CLEAN; these three are test-hardening follow-ups (no current defect) tracked for a future L1 pass, consistent with the founder's over-hardening posture. They do not gate this merge.

## What I could NOT break
Undetected byte or mode/exec-bit drift; a manifest verifying (or anchored) while its hashed identity lies; symlink/fifo/device injection incl. symlink-to-directory subtree smuggling; regular→symlink and file→dir swaps; path-case renames; wholesale re-freeze under a passed anchor; wrong-type anchors; malformed manifests/entries; build freezing a non-regular path; non-determinism. All fail-closed or flagged.
