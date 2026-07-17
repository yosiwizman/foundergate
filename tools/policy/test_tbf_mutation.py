"""TBF-1 mutation tests (11) — each controlled weakening MUST cause enforcement to fail.

This is the oracle-anchored 'guard fires' proof required for evaluation-class change control.
Run: python3 -m unittest test_tbf_mutation
"""
import json
import os
import tempfile
import unittest

import tbf_lib
from test_tbf_policy import complete_ui, POLICY, POINTER, POL, DIGEST, CANDIDATE


class TBFMutation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def _blocked(self, lane, man, root):
        state, _ = tbf_lib.derive_witness_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE)
        self.assertEqual(state, "MACHINE_VERIFICATION_BLOCKED")

    # M1 remove Playwright from a UI lane
    def test_m1_remove_playwright(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "actual_playwright"]
        self._blocked(lane, man, root)

    # M2 remove headed-browser evidence
    def test_m2_remove_headed(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "headed_local_browser"]
        self._blocked(lane, man, root)

    # M3 remove accessibility evidence
    def test_m3_remove_a11y(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "automated_accessibility"]
        self._blocked(lane, man, root)

    # M4 change UNKNOWN to PASS (a required test reported UNKNOWN must not pass)
    def test_m4_unknown_to_pass(self):
        lane, man, root = complete_ui(self.tmp)
        for t in man["tests"]:
            if t["class"] == "trace":
                t["status"] = "UNKNOWN"
        self._blocked(lane, man, root)

    # M5 allow stale evidence
    def test_m5_stale(self):
        lane, man, root = complete_ui(self.tmp)
        for t in man["tests"]:
            if t["class"] == "headless_exact_sha_ci":
                t["sha"] = "f" * 40
        self._blocked(lane, man, root)

    # M6 allow missing hashes / mismatched hash
    def test_m6_missing_hash(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"][0]["evidence"][0]["sha256"] = "0" * 64
        self._blocked(lane, man, root)

    # M7 allow a builder to self-approve
    def test_m7_builder_selfapprove(self):
        lane, man, root = complete_ui(self.tmp)
        man["checker"] = {"verdict": "SELF_APPROVED", "identity": "builder"}
        self._blocked(lane, man, root)

    # M8 allow a UI/manifest to set witness-ready directly
    def test_m8_ui_sets_ready(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "screenshots"]
        man["declared_witness_readiness"] = "READY_FOR_HUMAN_PERCEPTION_WITNESS"
        self._blocked(lane, man, root)

    # M9 allow green CI to grant merge (no founder gate / no decision packet)
    def test_m9_ci_grants_merge(self):
        lane, man, root = complete_ui(self.tmp)
        man["terminal0_decision_packet"] = False  # green everything else, but no packet + no founder
        ptr = tbf_lib.load_json(POINTER)
        state, _ = tbf_lib.derive_merge_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE, ptr)
        self.assertEqual(state, "MERGE_BLOCKED")

    # M10 remove independent checking
    def test_m10_remove_checker(self):
        lane, man, root = complete_ui(self.tmp)
        man["checker"] = {"verdict": "PENDING"}
        self._blocked(lane, man, root)

    # M11 weaken the policy without founder authority (integrity floor fires even if digest updated)
    def test_m11_weaken_policy(self):
        p = os.path.join(self.tmp, "weak.json"); pol = tbf_lib.load_policy(POLICY)
        pol["unknown_behavior"] = "PASS"  # the weakening
        with open(p, "w") as fh:
            json.dump(pol, fh)
        ptr = os.path.join(self.tmp, "ptr.json"); pt = tbf_lib.load_json(POINTER)
        pt["policy_digest"] = tbf_lib.sha256_file(p)  # attacker updates digest to match
        with open(ptr, "w") as fh:
            json.dump(pt, fh)
        ok, errs = tbf_lib.validate_policy_integrity(p, ptr)
        self.assertFalse(ok)
        self.assertTrue(any("FAIL_CLOSED" in e or "WEAKENED" in e for e in errs))


if __name__ == "__main__":
    unittest.main(verbosity=2)
