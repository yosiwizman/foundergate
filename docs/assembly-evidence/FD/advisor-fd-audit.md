# Terminal Advisor — FD-IMPLEMENT pre-witness audit (verbatim)

> **Provenance:** committed verbatim by the FounderGate CTO at the founder's instruction. Authored by the founder's
> **separate read-only Terminal Advisor lane** (not a CTO-dispatched subagent). Read-only evidence — the Advisor
> wrote nothing to the repo. Reproduced exactly as supplied.

---

TERMINAL ADVISOR — FD-IMPLEMENT PRE-WITNESS AUDIT (foundergate)
Provenance: founder's separate read-only Terminal Advisor lane (not a CTO-dispatched subagent); no product code executed, no network. Working tree on branch fd-implement @ 610075e (unmerged PR #73); origin/main = 8417fbe. Branch read via git show 610075e:, main via git show 8417fbe: — no checkout performed.
1. TABLE TRUTH (phantom-report check) → PASS. All four table SHAs resolve (git cat-file -t 0414887 610075e 2c13bc9 8417fbe → commit ×4). visual-capture.selftest.mjs: viewport-truth assertion lines 35-38 (rv.w===w && rv.h===h, "viewport mismatch"); in-embed measurement 41-46 (#preview-frame/#mock-send/withinFrame/CLIPPED). critical-path-gate.selftest.mjs:42 fires on L0 preview-send-clipped; :55-56 launcher refuses. Branch guards present (smoke, home-model, view-model, badge-visibility, design-consistency, no-secret-leak, injection, no-blocked-content-leak); CI runner discovers all *.selftest.mjs recursively. Minor citation drift: the table's :48 points at the throwaway-fixture check; the in-embed assertion is 41-46; :6/:9 are contract-comment lines — guards real, line numbers slightly off.
2. SPEC FIDELITY on 610075e → PASS with a spec-doc flag. The referenced 05_DESIGN_SPEC did not exist on disk at audit time (fidelity checked against enumerated requirements + committed guards): dashboard has 0 accordions; honesty superset always visible (smoke.mjs:82, green-CI line :84); alive line health-derived, UNKNOWN/STALE forwarded verbatim, never green; File Cabinet no-leak proofs byte-identical to main; Guide core diff empty (surface-only); embed send guarded in-embed.
3. HARNESS FIXES REAL on main → PASS — viewport assert (dSF pinned :31-33), in-embed measurement, launcher critical-path refusal — each reads as claimed.
4. LAW SWEEP on the branch → PASS — Law 54 (no invented state), Law 55 (decision amber, view-only), honest pause both locations (view-model.mjs:82-84), banned words blocked (smoke.mjs:100), calm color (var(--lock), "red = problem only"), enforcement untouched (cabinet.mjs, guide.mjs empty diffs).
5. LEDGERS on main → PASS — #71 0414887 VA-HARNESS-TRUTH, #72 2c13bc9 V8-B-CONTRACT-DRAFT resolve and match git log; #74 8417fbe stamps FD-IMPLEMENT "BUILT · PENDING FOUNDER WITNESS," not accepted, not merged; V8-A acceptance PENDING; no placeholders. Branch-protection enforce_admins UNKNOWN (network blocked in this lane); live CI execution UNKNOWN (exec blocked) — the CI run at 610075e must confirm green.
Bottom line: the FD-IMPLEMENT completion report is not a phantom — every SHA resolves, every guard exists and does what it claims, the reskin is presentation-only, FD-IMPLEMENT honestly recorded as built-pending-witness. Two non-blocking transparency notes: 05_DESIGN_SPEC absent on disk at audit time; protection/live-CI UNKNOWN in this read-only lane. This report is read-only evidence; the Advisor wrote nothing.

---

## Disposition (CTO, post-witness)
Both non-blocking transparency notes are now closed:
- **05_DESIGN_SPEC absent on disk** → committed at `docs/lanes/founder-design-v2/05_DESIGN_SPEC.md` (with the four
  mockups + `fg.css`); the spec reference now resolves on disk. This is the seed of the queued **Written-Authority Law**.
- **Protection / live-CI UNKNOWN in the read-only lane** → confirmed by the CTO lane: FD-IMPLEMENT merged through
  branch protection at product-final `85a59f9` with exact-SHA CI **green**.
- **Citation drift** → the completion table in `fd-acceptance.md` is corrected to the Advisor's precise lines
  (viewport-truth `35-38`, in-embed `41-46`).
