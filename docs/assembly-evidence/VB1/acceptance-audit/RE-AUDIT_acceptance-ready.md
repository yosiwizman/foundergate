# RE-AUDIT REPORT — VB1 Acceptance-Readiness Wave (independent, read-only)

> Fresh-context, read-only re-audit of the remediation + §12 pre-signature artifact. Authored by an auditor
> that did NOT author the pre-signature audit (author ≠ checker). Committed as evidence.

**Branch inspected:** `vb1-remediation-presig` · **HEAD:** `7b6d824` ("VB1 remediation + §12 pre-signature audit artifact") · **Base (main):** `c09b247`
**Method:** read-only git/node inspection of on-disk tree; attestation re-verified via `src/run-attestation/attestation.mjs`; suite + guard executed. No repo writes.

**Branch is minimal and addition-only.** `git diff c09b247 7b6d824` = exactly 3 files: `+REMOVAL-NOTE.md` (26 lines), `+advisor-pre-signature-audit.md` (7 lines), and a 1-line replacement in `ADVISOR_REGISTRY.md`. Nothing else.

## (1) L-1 CURED — PASS
- `REMOVAL-NOTE.md` exists, non-empty. States all required facts: the 0-byte `intervention-log.jsonl` (referenced by VERDICT.txt/README.md/REPACKAGING-NOTE.md) was removed under founder option-(b) at merge commit 4bd2f8e; the file never held run data; zero interventions over-determined by `monitor-record.jsonl` (481/481 quiet) + L2 attestation (unresolvedFailures:[]); no sealed byte modified.
- **Addition-only confirmed:** `git diff c09b247 7b6d824 -- .../run2-2026-07-15/` = only `REMOVAL-NOTE.md` added. No VERDICT.txt / README.md / REPACKAGING-NOTE.md / soak-*.json / attestation/* / monitor-record.jsonl touched.
- **Merge-commit claim independently verified:** 4bd2f8e exists, is an ancestor of main c09b247, message = "Remove 0-byte intervention-log.jsonl per founder ruling (option b)", and its only tree change was `intervention-log.jsonl | 0`. The file is absent from the HEAD tree and from disk.
- **Seals re-verified (nothing sealed changed):** loaded run2 and run24 `attestation/attestation.log`, imported verifyAttestation: run2 correct anchor (head hash e264fa28…) = intact, wrong anchor = broken-anchor; run24 correct anchor (head hash 5e9a4d5f…) = intact, wrong anchor = broken-anchor. run24 correctly carries its own 193-byte SD-1 sentinel intervention-log.jsonl.

## (2) PRE-SIGNATURE ARTIFACT — PASS
`advisor-pre-signature-audit.md` exists. PROVENANCE stated first and honest: "created on 2026-07-17 for the VB1 acceptance signature that has NOT yet occurred… NOT a backfill… that absence… remains permanently on the record as a mismatch." Carries ADVISOR VERDICT ending "RECOMMEND SIGNATURE" and cites the audited tree `src/v8b1 @ cba621e` (in both scope and verdict). It does not claim to retroactively fill the historical W4 gap.

## (3) BOTH AUDIT REPORTS STILL VALID — PASS
`git diff c09b247 7b6d824 -- docs/assembly-evidence/VB1/acceptance-audit/` = empty (unmodified by branch). `AUDIT_A_full-package-audit.md` verdict = FINDINGS, sole finding L-1 (LOW, non-blocking, "add a one-line note to the run2 bundle recording the option-(b) removal"). `AUDIT_B_acceptance-packet-audit.md` verdict = PACKET-SOUND (30/30 anchors resolve, `src/v8b1` byte-identical cba621e across build/both-soaks/bind). L-1's prescribed remediation is exactly what `REMOVAL-NOTE.md` delivers → Audit A's only blocking item is resolved.

## (4) §12 CHAIN COMPLETE — PASS
Author ≠ checker ≠ signer holds; every leg present:
- Independent build checker chain: `checker-report.md` + `checker-report-round2.md`, both stamped "builder ≠ checker," round-2 ALL CLOSED.
- Independent §29 soak re-derivation: performed in Audit A (spans, health windows, quiet samples, seals all re-derived from raw records).
- Two independent audits A + B, distinct contexts (neither read the other before writing its verdict).
- Advisor pre-signature audit authored separately — not by the re-auditor; it was already committed on the branch before this read-only re-audit began.
- Founder = sole signer; signature not yet fired (artifacts read as pending).
- No self-certification: CTO disposed findings, a separate subagent checked, the one historical SHWL self-cert attempt was withdrawn and independently re-checked. Registry standing-decisions line now reads "historical absence (W4) remains permanently recorded as a mismatch — never backfilled. Current artifact honestly created 2026-07-17… pre-signature as §12 requires" — the W4 mismatch is not erased.

## (5) SUITE + GUARDS — PASS
`npm test` → ALL GREEN: 83/83 (exit 0). Evidence-integrity guard → PASS (281 evidence files non-empty + placeholder-free; no write-before-truncate; safe stamp helper present). Guard covers both newly added files; no 0-byte evidence, no malformed stamped SHA in the new files.

## (6) NO OVERCLAIM — PASS
Nothing in the added files states VB1 is already accepted/signed. Pre-sig audit is explicit ("signature that has NOT yet occurred," "RECOMMEND SIGNATURE"); the sole "accepted" token is the conditional "Signing accepts… as accepted product" — future-conditional, not a claim of completion. Registry keeps VB1 under the HELD regime. Acceptance reads as pending the founder signature.

## Findings
None.

## FINAL VERDICT: ACCEPTANCE-READY
