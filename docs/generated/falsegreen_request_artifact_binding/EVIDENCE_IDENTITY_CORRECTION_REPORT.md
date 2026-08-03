# Evidence Identity Correction Report
Scope: **evidence metadata only.** No source, UI, test, or feature change.

## The defect
FINAL_STATUS.md stated the final head as `dc9a2badcbf1` and labeled it "branch tip after sealing commit."
That was wrong: `dc9a2badcbf1` was the FIRST commit of the correction (request→artifact binding), and a second
commit `d1b18cdc274d` (which stamped the head) was actually the branch tip. The stamp referenced its own
parent instead of the tip — an off-by-one evidence-identity defect caught by the outside Advisor.

## Heads (mechanically verified)
- **Previously reported final head:** `dc9a2badcbf1` (incorrect — the pre-stamp first commit).
- **Actual branch head BEFORE this correction:** `d1b18cdc274d57213cab93bf1d1e655599dace89`.
- **Actual branch head AFTER this correction:** `__AFTER_HEAD__` (this evidence-correction commit; the live tip
  is `git rev-parse HEAD` on the branch — see note below).
- Branch: `run/falsegreen-request-artifact-binding-20260803T0640ET` (non-main).

## What changed / did not change
- **Source / app / test files changed?** **NO.** Only evidence docs in
  `docs/generated/falsegreen_request_artifact_binding/` were edited (FINAL_STATUS.md + this report + the
  Checker/Terminal Advisor reports for this correction). Verified by `git diff --name-only d1b18cdc274d` showing
  only files under that docs path.
- **Product behavior:** unchanged and still verified — calculator→calculator (12/12), planner→planner (13/13),
  unsupported→UNSUPPORTED_LOCAL_TEMPLATE, deploy/merge/PR#200→HELD, preview derived from bound manifest.
- **Protected main untouched?** YES (`65fd01669f80`, unchanged).
- **PR #200 untouched?** YES (OPEN, draft, head `7d865fe61e3a`; no comment/edit/ready/close).
- **Gate 8 remains blocked?** YES. No deploy/bill/provider/customer-data/contact/merge/PR.

## Note on head self-reference
A commit cannot contain its own SHA. FINAL_STATUS.md therefore names the behavior-complete head
`d1b18cdc274d` (stable and correct) and defers the live branch tip to `git rev-parse HEAD`. The
`__AFTER_HEAD__` value below is stamped by a final metadata-only commit; the current tip is that stamp commit.
