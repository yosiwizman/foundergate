# Foreground Founder-Surface Contract (FFS-1)

**Status:** ACTIVE · evaluation-class · founder-authorized. Machine-enforced by policy v1.1.0
(`foreground_founder_surface` in UI_FLOOR + impact_matrix), `tools/policy/foreground_validate.py`,
and `tools/policy/test_ffs_mutation.py` (20 mutation proofs), wired into
`tools/policy/tbf_lib.py::derive_witness_readiness`.

Before any founder-facing UI witness, one full **foreground-visible** run must complete through the
real launcher + configured founder browser (Google Chrome) + real DOM path. Required, sealed to disk:
real launcher used · configured founder browser · headless=false · browser process identity · visible
window count · frontmost · not minimized · onscreen position · window dimensions · active macOS GUI
session · UI contract · candidate SHA · DOM transcript · screenshot sequence · continuous video ·
Playwright trace · console/network/page-error logs · download evidence where applicable · final DOM
assertions · independent checker verdict.

Allowed states: NOT_REQUIRED · REQUIRED_NOT_STARTED · FOREGROUND_TEST_RUNNING · FOREGROUND_TEST_FAILED
· FOREGROUND_TEST_BLOCKED · FOREGROUND_TEST_VERIFIED. **Only FOREGROUND_TEST_VERIFIED satisfies the
obligation.** headless=false alone is insufficient; a screenshot alone is not acceptance; headless CI
and foreground proof are distinct and non-interchangeable. If visibility cannot be mechanically proven
with existing permissions → `FFS1-HOLD: MACOS-WINDOW-VISIBILITY-PROOF-BLOCKED` (no narrative substitute).

**Completion invariant:** a Safety Check requiring an Evidence Pack may not display COMPLETE/DONE or a
witness candidate while the pack is UNKNOWN/MISSING/FAILED/CORRUPT/STALE/NOT-PASSED. Only
`COMPLETE_WITH_VERIFIED_EVIDENCE_PACK` may expose a completed candidate + Download.
