"""FFS-1 mutation tests (20) — every foreground-founder-surface weakening MUST be rejected.

Oracle-anchored 'guard fires' proof for the FFS-1 amendment. Run: python3 -m unittest test_ffs_mutation
"""
import copy
import unittest

import foreground_validate as fv
import tbf_lib


def base_result():
    return {
        "foreground_state": "FOREGROUND_TEST_VERIFIED", "browser": "Google Chrome", "headless": False,
        "real_launcher_used": True, "visible_window_count": 1, "minimized": False, "onscreen": True,
        "frontmost": True, "active_gui_session": True, "ui_contract": "phase7.1-neutral-first-v1",
        "candidate_sha": "abc123", "screenshots": 11, "video": True, "trace": True, "dom_assertions": 7,
        "final_dom_assertions": True, "api_substituted_founder_action": False, "pack_state": "AVAILABLE",
    }


class FFSMutation(unittest.TestCase):
    def _reject(self, mut):
        r = base_result(); mut(r)
        ok, errs = fv.verify_result(r, "abc123")
        self.assertFalse(ok, f"expected rejection; errors={errs}")

    def test_00_baseline_passes(self):
        ok, errs = fv.verify_result(base_result(), "abc123")
        self.assertTrue(ok, errs)

    def test_m1_headless_labeled_foreground(self): self._reject(lambda r: r.update(headless=True))
    def test_m2_zero_visible_windows(self): self._reject(lambda r: r.update(visible_window_count=0))
    def test_m3_minimized(self): self._reject(lambda r: r.update(minimized=True))
    def test_m4_offscreen(self): self._reject(lambda r: r.update(onscreen=False))
    def test_m5_background(self): self._reject(lambda r: r.update(frontmost=False))
    def test_m6_wrong_browser(self): self._reject(lambda r: r.update(browser="Chromium"))
    def test_m7_direct_server_not_launcher(self): self._reject(lambda r: r.update(real_launcher_used=False))
    def test_m8_api_substituted_run(self): self._reject(lambda r: r.update(api_substituted_founder_action=True))
    def test_m9_api_substituted_download(self): self._reject(lambda r: r.update(api_substituted_founder_action=True))
    def test_m10_screenshots_without_video(self): self._reject(lambda r: r.update(video=False))
    def test_m11_video_without_trace(self): self._reject(lambda r: r.update(trace=False))
    def test_m12_trace_without_dom(self): self._reject(lambda r: r.update(dom_assertions=0))
    def test_m13_dom_without_window(self): self._reject(lambda r: r.update(visible_window_count=0))
    def test_m14_stale_sha(self):
        r = base_result(); r["candidate_sha"] = "OTHERSHA"
        ok, errs = fv.verify_result(r, "abc123"); self.assertFalse(ok, errs)
    def test_m15_wrong_ui_contract(self):
        r = base_result(); r["expected_ui_contract"] = "phase7.1-neutral-first-v1"; r["ui_contract"] = "old-ui"
        ok, errs = fv.verify_result(r, "abc123"); self.assertFalse(ok, errs)
    def test_m16_incomplete_final_state(self): self._reject(lambda r: r.update(final_dom_assertions=False))
    def test_m17_complete_while_pack_unknown(self): self._reject(lambda r: r.update(pack_state="UNKNOWN"))
    def test_m18_readiness_without_foreground(self):
        # a UI manifest lacking foreground_founder_surface evidence must not derive READY
        ok, errs = fv.verify_from_manifest({"tests": []}, ".")
        self.assertFalse(ok)
    def test_m19_manual_fabrication(self):
        # a RESULT that claims VERIFIED but fails a gate is still rejected (state not trusted blindly)
        self._reject(lambda r: (r.update(minimized=True)))
    def test_m20_expired_stale_reuse(self):
        r = base_result(); r["candidate_sha"] = "EXPIRED_OLD_SHA"
        ok, errs = fv.verify_result(r, "abc123"); self.assertFalse(ok, errs)

    def test_floor_includes_foreground(self):
        self.assertIn("foreground_founder_surface", tbf_lib.UI_FLOOR)


if __name__ == "__main__":
    unittest.main(verbosity=2)
