# AUDIT A — Independent Adversarial Full-Package Audit of the VB1 Acceptance Case

> Two-audit VB1 acceptance-readiness wave. Independent lane A (adversarial), separate context from Audit B;
> neither audit read the other before writing its verdict. Read-only toward all governed state. Committed as evidence.

**Bind SHA:** `b904366856d4adc8ec1332a83a6c3998863e52b4` (== HEAD == main == origin/main; verified). Working tree clean except one untracked, out-of-scope file `docs/assembly-evidence/VA/stranger-test-run-5.md` (not part of VB1).

---

## (1) The VB1 build — checker chain

- **Committed evidence exists:** `docs/assembly-evidence/VB1/checker-report.md` and `checker-report-round2.md` are both git-tracked at bind SHA.
- **Builder ≠ checker:** Both reports state they were "produced by an INDEPENDENT read-only adversarial checker subagent (builder ≠ checker)." The `| VB1 |` ledger row (PR #90, code SHA `ddafb6d`, resolves → "Merge pull request #90 from yosiwizman/vb1-run-launcher") credits "Builder + INDEPENDENT adversarial checker (round-2 ALL CLOSED) + CI." No self-certification: the CTO *disposed* findings; the *checker* is a separate subagent; the *founder* signs acceptance (still outstanding).
- **Round-1 findings:** 2 HIGH + 3 MEDIUM + 2 LOW = 7. Matches ledger ("round-1 2 HIGH + 3 MEDIUM + 2 LOW").
- **Round-2:** "ALL SEVEN ROUND-1 FINDINGS CLOSED — mergeable." HIGH-1 (forgeable act edge), HIGH-2 (rollback arbitrary write), MEDIUM-1/2/3, LOW-1 verified CLOSED by re-running repros; LOW-2 accepted residual; NEW-1/NEW-2 are LOW non-blocking VB3-era notes. `VB3_VERIFIER = null` ⇒ nothing executes for real in VB1.
- Source present: `src/v8b1/{session-token,rollback,executor,atomic-store}.mjs` (+ selftests).

**Verdict on (1): sound. No self-certification, builder≠checker, all round-1 findings closed in committed round-2 evidence.**

## (2) §29 endurance evidence — re-derived from raw records (not VERDICT.txt)

| Metric (source) | run2 8h | run24 24h |
|---|---|---|
| Span from raw startTs/endTs in soak-*.json | 8.0026 h / 28809.249 s (03:10:52.436Z → 11:11:01.685Z) | 24.0021 h / 86407.658 s (2026-07-16T02:23:38.583Z → 2026-07-17T02:23:46.241Z) |
| Span ≥ claim | ok (≥ 8 h) | ok (≥ 24 h) |
| Health samples (ok/fail) | ok 33 / fail 0 (33 windows) | ok 97 / fail 0 (97 windows) |
| Quiet run-phase samples (monitor-record.jsonl) | 481/481 quiet:true, 0 quiet:false, 0 downgrades | 1441/1441 quiet:true, 0 quiet:false, 0 downgrades |
| Attestation, correct anchor | verifyAttestation → "intact" | → "intact" |
| Attestation, deliberately WRONG anchor | → "broken-anchor" | → "broken-anchor" |

All re-derived numbers match the ledger rows (`VB1-SOAK-RUN2-PASS` and `VB1-SOAK-24H-PASS`) exactly, including run24's 86407.658s. Anchors verified via `src/run-attestation/attestation.mjs` verifyAttestation against `attestation-anchor.json` expectedHeadHash (run2 head hash e264fa28…, run24 head hash 5e9a4d5f…; both distinct from the git external-anchor SHAs). Attested code SHAs resolve as commits (run2 490440d2, run24 0cd51f8d); evidence commits resolve (run2 684dc8b, run24 adb64c6, merge 01b026f = PR #133). Attestation-anchor spanSeconds (28818.727 / 86415.826) bracket slightly wider than the health-window span because they measure RUN_OPEN→RUN_SEAL; both still exceed claim — consistent, not a defect.

**run2 intervention-log honesty:** run24 correctly carries the SD-1 sentinel `intervention-log.jsonl` (1 line, log-opened, bound run_30ced1a1). run2's file is ABSENT — and this is the founder-ruled outcome: git history shows 3665c13 (added empty file per REPACKAGING-NOTE) → 4bd2f8e "Remove 0-byte intervention-log.jsonl per founder ruling (option b)", and 4bd2f8e is an ancestor of the bind SHA. The governing `VB1-SOAK-RUN2-PASS` ledger row honestly records this ("pre-fix driver created no intervention log on a zero-intervention run … defect SD-1 tracked and CLOSED by PR #127"). See finding L-1 below for a residual staleness inside the run2 bundle.

## (3) Suite health — npm test (run once)

**ALL GREEN: 83/83 self-test(s) passed.** Exit 0. (Includes the 29 VB1 proofs and VB2 lane-isolation/no-act-edge suites.)

## (4) Honest gaps — confirmed STILL honest (PASS condition)

- **VB1 pre-signature-audit artifact:** `git ls-files docs/assembly-evidence/VB1/` contains no advisor/pre-signature artifact (VB0 has one for contrast). Honestly recorded as OPEN/absent in `docs/status/ROADMAP-v7-status.md` ("This gap stays OPEN … NOT fabricated, backfilled, or backdated") and `docs/status/ADVISOR_REGISTRY.md` ("genuinely ABSENT, honestly recorded (W4), stays OPEN, never backfilled"). Not backfilled.
- **W1-H1:** `ADVISOR_REGISTRY.md` — "tracked hardening item, future evaluation-class lane, not authorized." Tracked-not-implemented, unchanged.

## (5) Drift

- All three soak ledger rows and the VB1 core row state acceptance is HELD (core row: "DONE (core merged; acceptance HELD for §29 soak)"; 24h row: "VB1 acceptance remains HELD — audits + signature outstanding"). No document anywhere claims VB1 is *accepted*. VB1 is correctly presented as HELD, not accepted.
- Every cited SHA/PR/artifact resolves on disk. No "PASS" lacks a sealed artifact.
- One residual internal-consistency drift inside the run2 bundle → L-1.

---

## Findings

**L-1 (LOW, non-blocking) — Stale manifest references inside the run2 bundle after the founder option-(b) removal.** At bind SHA, `run2-2026-07-15/VERDICT.txt` line 9 ("failures & interventions log: intervention-log.jsonl") and `README.md` lines 31/41/62 still list `intervention-log.jsonl` as an (empty) manifest artifact, and `REPACKAGING-NOTE.md` affirmatively states the empty file was *added* — but the file was subsequently *removed* per founder ruling (commit 4bd2f8e), and no in-bundle document records that removal. This re-creates precisely the "manifest names a file the bundle does not contain" defect-class the REPACKAGING-NOTE itself flagged. **Why it does not block acceptance:** the L2 attestation seal binds run *data*, not these manifest docs, and both seals verify intact; the authoritative EVIDENCE_LEDGER row honestly records the absence and the founder ruling; and every substantive PASS precondition (span, 33/97 health, 481/1441 quiet, seal-intact + wrong-anchor-rejected) was independently re-derived. **Remediation:** add a one-line note to the run2 bundle (or correct VERDICT.txt/README) recording the option-(b) removal so the bundle's own manifest matches disk.

No HIGH or MEDIUM findings. No self-certification, no silent backfill, no seal failure, no unsupported PASS, no false "accepted" claim.

---

## FINAL VERDICT: FINDINGS

One LOW, non-blocking documentation-drift finding (L-1) — a stale `intervention-log.jsonl` manifest reference inside the run2 bundle that survives the founder's option-(b) removal, with no in-bundle note of the removal. It does not falsify any §29 PASS precondition (all independently re-derived and intact), does not break either attestation seal, and the governing EVIDENCE_LEDGER row is honest. Everything else is sound: checker chain clean (builder≠checker, 7/7 round-1 findings closed, no self-cert), both soak legs re-derived and sealed, 83/83 tests green, both honest gaps (VB1 pre-signature audit; W1-H1) still honestly open and un-backfilled, and VB1 correctly presented as HELD (not accepted). Recommendation: fix L-1 with a one-line bundle note; the acceptance case is otherwise substantively ready to proceed to the two audits + founder signature.
