# Terminal Advisor — READ-ONLY disk-audit prompt for V8-A3 (dispatch before A3 acceptance)

> **Plain English.** This is a ready-to-dispatch prompt for the independent Terminal Advisor (read-only disk
> auditor). It asks the Advisor to verify the V8-A3 evidence chain **from disk/Git only** — no writing, no
> merging — before V8-A3 is closed. Save-only for now; dispatch it after G2-A3 passes and before A3 acceptance.

---

## Prompt to paste into the Terminal Advisor (read-only lane)

```
TERMINAL ADVISOR (read-only disk audit) — verify the FounderGate V8-A3 File Cabinet evidence chain. You WRITE
NOTHING, MERGE NOTHING, and run only read-only inspection (git log/show/ls-files/grep, file reads, gh read-only
if available). Report findings; do not fix anything.

Repo: /Users/yosiwizman/Projects/foundergate (private). V8-A3 product-final commit: e92f8b9.

Verify each, CONFIRMED or FINDING with the exact path/command:
1. PRODUCT FROZEN AT e92f8b9. `git diff --stat e92f8b9..HEAD` touches ONLY docs/assembly-evidence/ (no src/ change
   after the product-final commit). List any non-docs path in that range.
2. EXACT-SHA CI. The V8-A3 acceptance packet's exact-SHA CI reference resolves to a real, green selftests run
   bound to e92f8b9 (cross-check the Evidence Ledger row and, if gh is available, `gh run view`).
3. NO-SECRET-LEAK PROOF IS TRACKED + RUNS IN CI. `git ls-files` includes
   src/v8a3/filecabinet/no-secret-leak.selftest.mjs (NOT gitignored — `git check-ignore` returns nonzero), it is
   discovered by scripts/run-selftests.mjs, and it passes locally.
4. INDEPENDENT CHECKER EVIDENCE. docs/assembly-evidence/A3-FC/checker-report.md and checker-report-round2.md are
   tracked, non-empty, and record round-1 FAIL (2 HIGH leaks) → round-2 PASS (all CLOSED). Each round-1 finding
   maps to a test that exists in src/v8a3/filecabinet/*.selftest.mjs.
5. STAMPS ARE REAL. Every stamped SHA in the V8-A3 evidence (acceptance packet, Evidence Ledger, Where-Am-I)
   matches ^[0-9a-f]{7,40}$ and every PR reference is a nonzero number (no empty or malformed values). The
   evidence-integrity guard (src/tools/evidence-integrity.selftest.mjs) passes.
6. SECRET-HIDING HOLDS FROM DISK. Confirm the classifier/enforcer (src/v8a3/filecabinet/cabinet.mjs) has: allowlist
   -only reasoning, realpathSync symlink re-classification, fail-closed access, escalate-only rules. Try to find a
   filename or symlink that would leak a secret (adversarial, read-only).
7. SCOPE. No V8-A4/V8-B code exists (src has no project-guide/route/queue implementation); the File Cabinet is
   read-only (no edit/delete/Open-in-GitHub/Project-Guide-answer path).
8. PRIVACY. The repo is private.

Return: a table of items 1–8 CONFIRMED/FINDING (path + reasoning), any additional disk-level concern, and a
one-paragraph plain-English verdict for a non-developer founder. This audit is independent verification; the
CTO-run self-tests and checker reports are inputs to cross-check, not a substitute for your disk read.
```

---

## Dispatch notes
- **When:** after G2-A3 passes, before recording V8-A3 acceptance/close.
- **Who:** the independent Terminal Advisor (read-only lane) — never the CTO seat.
- **Output home:** save the Advisor's report under `docs/assembly-evidence/A3/advisor-audit-report.md` when run.
