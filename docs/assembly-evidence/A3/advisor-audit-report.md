TERMINAL ADVISOR — V8-A3 EVIDENCE-CHAIN AUDIT (foundergate @ frozen product SHA e92f8b9)

Repo: ~/Projects/foundergate · HEAD = origin/main = 224b3ea1b127237414756a2365dd21760d57ea95 · e92f8b9 = e92f8b9c0df81950adb2dc9a99491674cfd4bc20 (Merge PR #32). Read-only; I ran no product code and no network. Anything needing exec/network is marked UNKNOWN with the reason.

1. FROZEN — src/v8a3/** unchanged since e92f8b9 → PASS
- git diff --name-only e92f8b9 HEAD -- src/v8a3 → empty (byte-identical).
- git log --oneline -8 -- src/v8a3 → newest commit touching it is 320ab10 ("A3-BUILD Phase FC-UI + AC"), which is PR #32's content commit merged at e92f8b9. No post-e92f8b9 commit appears — notably A3-PARALLEL 823fa4b did not touch src/v8a3. Frozen.

2. CHECKER TRAIL → PASS
- Both checker reports exist, non-empty (2714 / 2190 bytes).
- Round-1 verdict FAIL with exactly 2 HIGH: #1 broken ** glob (nested analytics/pii not escalated), #2 no-realpath symlink leak (README.md→.env / roadmap.md→/etc/hosts) — plus #3 MED, #4 LOW.
- Round-2 verdict PASS — all four CLOSED, "New holes introduced by the fixes: none found."
- Each round-1 finding maps to a named test that actually exists: FINDING 1 → no-secret-leak.selftest.mjs:95; FINDING 2 → no-secret-leak.selftest.mjs:75 + :84; FINDING 3 → classify.selftest.mjs:15; FINDING 4 → no-secret-leak.selftest.mjs:108.

3. PROOF RUNS IN CI → PASS
- git ls-files: all *.selftest.mjs tracked, incl. no-secret-leak.selftest.mjs; git check-ignore → exit 1 (not ignored).
- CI: .github/workflows/selftests.yml runs npm test on push(main)+pull_request; package.json "test": "node scripts/run-selftests.mjs"; the runner recursively finds every *.selftest.mjs under src/ and runs each as its own Node process, exiting non-zero on any failure.

4. STAMPS REAL → PASS (one sub-item UNKNOWN)
- Every stamped SHA matches ^[0-9a-f]{7,40}$ and git cat-file -t = commit: aa8fcc1, b549716…, e92f8b9…, 823fa4b…, 224b3ea. PR refs #29/#31/#32/#33/#34 nonzero; CI run IDs 29097063338/29098222302 nonzero.
- Placeholder scan over packet + all three ledgers → no real placeholders (sole hit is descriptive prose in the guard's own policy note).
- UNKNOWN: "evidence-integrity guard passes when run" — cannot execute in this read-only lane. Guard exists, is tracked, and is CI-wired; its static inputs all check out; live green must be confirmed by CI (actions/runs/29097063338 at e92f8b9).

5. LEDGER COHERENCE → PASS
- G1-A3-IMPL APPROVED at PR #29/aa8fcc1 recorded. Evidence rows A3-FC-CLASS #31/b549716, A3-FC-UI + A3-AC #32/e92f8b9 + CI 29097063338, A3-PARALLEL #33/823fa4b + CI 29098222302 all match git log. Main head 224b3ea (Merge PR #34); only PR merges after. Minor non-blocking nit: EVIDENCE_LEDGER.md:48 has two table rows concatenated on one line — cosmetic.

6. ADVERSARIAL SPOT-CHECK — cabinet.mjs (read, not executed) → no bypass found
- Single content-return site: readFileSync at line 168 inside gated(), reached only after the class gate at line 167. All three entrypoints safePreview/safeCopy/safeDownload funnel through gated(). No exported function returns content by any other path.
- Fail-safe: effective = mostRestrictive(nameCls, realCls); symlink escape outside root → SECRET-blocked; traversal/absolute → throw → caught → fail-closed; blocked() reasons never include content.
- One residual: theoretical TOCTOU between realpathSync and readFileSync — the same residual round-2 recorded and dispositioned as accepted risk / optional future hardening (fd-based O_NOFOLLOW). Concur: not a content-without-gate path by inspection.

SUMMARY: 1 FROZEN PASS · 2 CHECKER TRAIL PASS · 3 PROOF RUNS IN CI PASS · 4 STAMPS REAL PASS (guard live-run UNKNOWN, satisfied by CI at e92f8b9) · 5 LEDGER COHERENCE PASS (one cosmetic nit) · 6 ADVERSARIAL PASS. Everything verifiable from disk/git passes. This report is read-only evidence; the Advisor wrote nothing.
