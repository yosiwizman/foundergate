# VB2 M1 Soak — Qualification Applicability
**M1_SOAK_APPLICABILITY: ACCEPTED_VB2_STAGE_ONLY.**
- Evaluated SHA b9af1def (Merge PR #149 lane-a-vb2-build) is an ancestor of the cumulative head.
- Governed scope = src/** + scripts/** + package.json (340 files). Between b9af1def and the cumulative
  head: **339 unchanged, 1 modified (package.json), 0 deleted.** The single change is an ADDITIVE
  `devDependencies` block (@axe-core/playwright, @playwright/test) — test tooling with **zero VB2
  runtime effect**; no production dependency, soak-driver, lease, attestation or scripts/** change.
- Therefore the soak validly ACCEPTS the VB2 machinery and CLEARS the active-window merge embargo. It
  does NOT prove the entire cumulative head endured 8 hours; the later OpenSandbox/Phase-7.1/TBF/FFS
  work is evidence-only candidate work that does not introduce a soak-requiring production runtime, so
  current disk authority does NOT require an exact-current-head 8h soak before the cumulative merge.
- Honest limits: a PASS at b9af1def qualifies b9af1def and its byte-identical governed runtime; the
  active-embargo clearance is NOT a claim that the cumulative head was soaked 8h.
