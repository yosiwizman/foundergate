# Lane D — Evidence Hygiene Sweep (run 2)

> Independent READ-ONLY hygiene sweep of the evidence surface at `main` `0a48a144…` (wide wave 2). Committed as evidence. Nothing was fixed here — any real defect would get its own finding-specific PR.

**VERDICT: CLEAN** — newest ledger rows present with resolvable git SHAs; all wave-1/wave-2 evidence paths resolve non-empty; every gate-pass-token occurrence classifies as (a) a disclosed accumulator sub-result or (b) law/template/test/negation. **Zero class-(c) anomalies** (no bare pass line masquerading as a gate verdict anywhere).

## 1. Ledger tails — resolve / consistent
Newest rows present in both ledgers and their cited git SHAs all resolve (`git rev-parse --verify`): W1 `G-W1-VB1-HARDENING` (SIGNED) + W2 `G-W2-VB2-COS` (SIGNED) @ `490440d`; `VB1-SOAK-NOT-PASSED` (evidence `a8200fe`, attested `c22b86a2`, merge `be116b5`); `L1-L4-EVIDENCE-INTEGRITY` (`5f3a1d2/69a312b/a9f0deb/490477a`, doc `708b034`); `SHWL-AUTHORITY` (`9ef4fa0`/`6a4488d`); `SHWL-BUILD` (`628bb11`/`5a9cea49`). **No unresolvable git SHA.**
- The VB1-SOAK row's `expectedHeadHash 55b23ad0…` (64-hex) is correctly NOT a git object — it is the run-attestation sealed-head hash, documented as such in `attestation-anchor.json`. Cosmetic wording note (not fixed here): the ledger parenthetical loosely reads the head-hash and the git SHA as one anchor; the anchor file cleanly disambiguates them. No finding.

## 2. Wave-1 / wave-2 evidence paths — on disk, non-empty
`wide-checks/wide-lane-independent-checks.md`, `wide-checks-run2/wide-lane-independent-rechecks-run2.md`, `soak-driver-harvest/{BUILD_REPORT,checker-report}.md`, `VB1/soak/run-2026-07-14/{README.md,VERDICT.txt}`, `shwl-build/{checker-report-round1,checker-report-round2,pre-acceptance-audit}.md`, `shwl/independent-check-9ef4fa0.md` — **all present and non-empty.** (The run-2026-07-14 bundle README is committed as `README.md`; no gap.)

## 3. Gate-pass-token sweep (`…HOUR SOAK PASS` / `SOAK PASS`)
- **Class (a) — disclosed accumulator availability sub-result** (the exact W1-H1 hazard): the run-2026-07-14 bundle carries a bare availability `…SOAK PASS` in `soak-8h-PASS.txt:1` and quoted at `VERDICT.txt:18` — while `VERDICT.txt:1` is the gate line `…SOAK — NOT-PASSED` (self-negating) and `README.md:32` disclaims both. Tracked as W1-H1; not a gate verdict.
- **Class (b) — law / template / `<N>-HOUR` placeholder / negation / disclaimer** (benign): Assembly Manual §29, V8-B build contract, akior soak-guidance/harvest authorities, `vb1-hardening-amendment.md`, `ROADMAP-v6.md`; numerous explicit "no soak-pass line" disclaimers (L2/L4 reports, SOAK_PLAN, VB0 audits, etc.); and code templates/tests that FORBID or assert-absence-of the banner (`reliability-soak.mjs` + selftest, `report-provenance.mjs` + selftest, `run-attestation` guards, `soak-driver.mjs`, `soak-monitor.mjs`).
- **Class (c) — anomaly (bare pass presented AS a gate verdict elsewhere): NONE.**

**Bottom line:** ledgers consistent + SHA-resolvable; evidence intact; no phantom SHA; no orphan gate-pass token. The single bare-PASS pair is the known, disclosed, tracked W1-H1 sub-result — correctly not treated as a gate verdict.
