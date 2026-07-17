"""TBF-1 policy selftests (30) — prove the machine enforcement actually blocks/permits.

Builds synthetic lane contracts + evidence manifests in temp dirs and asserts validator outcomes
against the REAL on-disk policy. Standard library only. Run: python3 -m unittest test_tbf_policy
"""
import hashlib
import json
import os
import tempfile
import unittest

import tbf_lib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
POLICY = os.path.join(REPO, ".foundergate", "policies", "test_before_founder.json")
POINTER = os.path.join(REPO, ".foundergate", "state", "test_before_founder_policy_pointer.json")
CANDIDATE = "a" * 40
DIGEST = tbf_lib.sha256_file(POLICY)
POL = tbf_lib.load_policy(POLICY)


def _write(path, text="ok"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(text)
    return hashlib.sha256(text.encode()).hexdigest()


def complete_ui(tmp):
    """A fully-compliant synthetic UI lane + evidence rooted at tmp."""
    derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
    concrete = [c for c in derived if c not in tbf_lib.META_CLASSES]
    tests = []
    for c in concrete:
        rel = f"evidence/{c}.txt"
        h = _write(os.path.join(tmp, rel), f"evidence for {c}")
        tests.append({"class": c, "status": "PASS", "sha": CANDIDATE,
                      "evidence": [{"path": rel, "sha256": h}]})
    lane = {
        "lane_id": "synthetic-ui", "policy_version": POL["version"], "policy_digest": DIGEST,
        "base_sha": CANDIDATE, "risk_class": "high", "impact_classes": ["UI_AFFECTING"],
        "required_test_classes": list(derived), "not_applicable": [], "current_state": "IN_PROGRESS",
        "founder_gate_required": True,
    }
    manifest = {
        "lane_id": "synthetic-ui", "candidate_sha": CANDIDATE, "policy_version": POL["version"],
        "policy_digest": DIGEST, "impact_classes": ["UI_AFFECTING"], "tests": tests,
        "not_applicable": [], "checker": {"verdict": "CLEAN", "identity": "independent"},
        "advisor": {"present": True, "verdict": "READY"},
        "founder_witness_or_signature": False, "terminal0_decision_packet": True,
    }
    return lane, manifest, tmp


class TBFPolicy(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    # 1 policy missing blocks
    def test_01_policy_missing(self):
        ok, _ = tbf_lib.validate_policy_integrity(os.path.join(self.tmp, "none.json"), POINTER)
        self.assertFalse(ok)

    # 2 digest mismatch blocks
    def test_02_digest_mismatch(self):
        p = os.path.join(self.tmp, "ptr.json")
        ptr = tbf_lib.load_json(POINTER); ptr["policy_digest"] = "0" * 64
        json.dump(ptr, open(p, "w"))
        ok, errs = tbf_lib.validate_policy_integrity(POLICY, p)
        self.assertFalse(ok); self.assertTrue(any("digest" in e for e in errs))

    # 3 UNKNOWN impact fails closed
    def test_03_unknown_impact(self):
        lane, _, _ = complete_ui(self.tmp); lane["impact_classes"] = ["UNKNOWN"]
        ok, errs, derived = tbf_lib.validate_lane(lane, POL, POLICY, POINTER)
        self.assertFalse(ok); self.assertIsNone(derived)

    # 4 UI lane without Playwright blocked (lane omits it)
    def test_04_ui_without_playwright(self):
        lane, _, _ = complete_ui(self.tmp)
        lane["required_test_classes"] = [c for c in lane["required_test_classes"] if c != "actual_playwright"]
        ok, errs, _ = tbf_lib.validate_lane(lane, POL, POLICY, POINTER)
        self.assertFalse(ok); self.assertTrue(any("actual_playwright" in e for e in errs))

    # 5 UI lane without headed evidence blocked
    def test_05_ui_without_headed(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "headed_local_browser"]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("headed_local_browser" in e for e in errs))

    # 6 UI lane without headless exact-SHA CI blocked
    def test_06_ui_without_ci(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "headless_exact_sha_ci"]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok)

    # 7 UI lane without screenshots blocked
    def test_07_ui_without_screenshots(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "screenshots"]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, _ = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok)

    # 8 UI lane without accessibility blocked
    def test_08_ui_without_a11y(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "automated_accessibility"]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, _ = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok)

    # 9 prepopulated false-green state blocked (false_green missing)
    def test_09_false_green(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "false_green"]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("false_green" in e for e in errs))

    # 10 runtime lane without teardown blocked
    def test_10_runtime_without_teardown(self):
        derived = tbf_lib.derive_required(["RUNTIME_AFFECTING"], POL)
        self.assertIn("teardown", derived)
        man = {"candidate_sha": CANDIDATE, "tests": [
            {"class": c, "status": "PASS", "sha": CANDIDATE} for c in derived
            if c not in tbf_lib.META_CLASSES and c != "teardown"]}
        ok, errs = tbf_lib.validate_evidence(man, POL, self.tmp, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("teardown" in e for e in errs))

    # 11 runtime lane without recovery proof blocked
    def test_11_runtime_without_recovery(self):
        derived = tbf_lib.derive_required(["RUNTIME_AFFECTING"], POL)
        man = {"candidate_sha": CANDIDATE, "tests": [
            {"class": c, "status": "PASS", "sha": CANDIDATE} for c in derived
            if c not in tbf_lib.META_CLASSES and c != "crash_recovery"]}
        ok, errs = tbf_lib.validate_evidence(man, POL, self.tmp, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("crash_recovery" in e for e in errs))

    # 12 gate change without bypass tests blocked
    def test_12_gate_without_bypass(self):
        derived = tbf_lib.derive_required(["GATE_OR_AUTHORITY_AFFECTING"], POL)
        man = {"candidate_sha": CANDIDATE, "tests": [
            {"class": c, "status": "PASS", "sha": CANDIDATE} for c in derived
            if c not in tbf_lib.META_CLASSES and c != "unauthorized_path"]}
        ok, errs = tbf_lib.validate_evidence(man, POL, self.tmp, derived, CANDIDATE)
        self.assertFalse(ok)

    # 13 gate change without independent checker blocked (witness derivation)
    def test_13_gate_without_checker(self):
        derived = tbf_lib.derive_required(["GATE_OR_AUTHORITY_AFFECTING"], POL)
        lane = {"lane_id": "g", "policy_version": POL["version"], "policy_digest": DIGEST,
                "base_sha": CANDIDATE, "risk_class": "high",
                "impact_classes": ["GATE_OR_AUTHORITY_AFFECTING"],
                "required_test_classes": list(derived), "current_state": "x"}
        man = {"lane_id": "g", "candidate_sha": CANDIDATE, "tests": [
            {"class": c, "status": "PASS", "sha": CANDIDATE, "evidence": []}
            for c in derived if c not in tbf_lib.META_CLASSES],
            "checker": {"verdict": "PENDING"}}
        state, _ = tbf_lib.derive_witness_readiness(lane, man, POL, self.tmp, POLICY, POINTER, CANDIDATE)
        self.assertNotEqual(state, "READY_FOR_HUMAN_PERCEPTION_WITNESS")

    # 14 doc-only lane may mark browser NA with valid reason
    def test_14_doc_na_ok(self):
        derived = tbf_lib.derive_required(["DOCUMENTATION_ONLY"], POL)
        lane = {"lane_id": "d", "policy_version": POL["version"], "policy_digest": DIGEST,
                "base_sha": CANDIDATE, "risk_class": "low",
                "impact_classes": ["DOCUMENTATION_ONLY"], "required_test_classes": list(derived),
                "not_applicable": [{"class": "headed_local_browser", "reason": "no_rendered_surface"}],
                "current_state": "x"}
        ok, errs, _ = tbf_lib.validate_lane(lane, POL, POLICY, POINTER)
        self.assertTrue(ok, errs)

    # 15 invalid NOT_APPLICABLE reason rejected
    def test_15_invalid_na_reason(self):
        lane, _, _ = complete_ui(self.tmp)
        lane["not_applicable"] = [{"class": "trace", "reason": "because_i_said_so"}]
        # 'trace' is required for UI, so double-fail; use a non-required class to isolate reason check
        lane2 = dict(lane); lane2["impact_classes"] = ["DOCUMENTATION_ONLY"]
        lane2["required_test_classes"] = list(tbf_lib.derive_required(["DOCUMENTATION_ONLY"], POL))
        lane2["not_applicable"] = [{"class": "headed_local_browser", "reason": "bogus_reason"}]
        ok, errs, _ = tbf_lib.validate_lane(lane2, POL, POLICY, POINTER)
        self.assertFalse(ok); self.assertTrue(any("invalid NOT_APPLICABLE" in e for e in errs))

    # 16 missing evidence file rejected
    def test_16_missing_file(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"][0]["evidence"] = [{"path": "evidence/does-not-exist.txt", "sha256": "0" * 64}]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("missing" in e for e in errs))

    # 17 corrupt evidence hash rejected
    def test_17_corrupt_hash(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"][0]["evidence"][0]["sha256"] = "0" * 64
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("hash mismatch" in e for e in errs))

    # 18 stale CI SHA rejected
    def test_18_stale_sha(self):
        lane, man, root = complete_ui(self.tmp)
        for t in man["tests"]:
            if t["class"] == "headless_exact_sha_ci":
                t["sha"] = "b" * 40
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("stale" in e.lower() for e in errs))

    # 19 builder-only review rejected where independent review required
    def test_19_builder_only_review(self):
        lane, man, root = complete_ui(self.tmp)
        man["checker"] = {"verdict": "PENDING", "identity": "builder"}
        state, _ = tbf_lib.derive_witness_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE)
        self.assertNotEqual(state, "READY_FOR_HUMAN_PERCEPTION_WITNESS")

    # 20 witness readiness cannot be manually set
    def test_20_witness_not_manual(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "screenshots"]  # incomplete
        man["declared_witness_readiness"] = "READY_FOR_HUMAN_PERCEPTION_WITNESS"  # a lie
        state, _ = tbf_lib.derive_witness_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE)
        self.assertEqual(state, "MACHINE_VERIFICATION_BLOCKED")

    # 21 merge readiness cannot be manually set (derived; incomplete evidence blocks)
    def test_21_merge_not_manual(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "trace"]
        ptr = tbf_lib.load_json(POINTER)
        state, _ = tbf_lib.derive_merge_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE, ptr)
        self.assertEqual(state, "MERGE_BLOCKED")

    # 22 green CI without founder gate remains blocked where gate required
    def test_22_ci_without_gate(self):
        lane, man, root = complete_ui(self.tmp)   # founder_gate_required True, no founder sig
        ptr = tbf_lib.load_json(POINTER)
        state, errs = tbf_lib.derive_merge_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE, ptr)
        self.assertEqual(state, "MERGE_BLOCKED")
        self.assertTrue(any("founder" in e for e in errs))

    # 23 unauthorized policy weakening rejected (integrity floor)
    def test_23_weakening_rejected(self):
        p = os.path.join(self.tmp, "weak.json"); pol = tbf_lib.load_policy(POLICY)
        pol["impact_matrix"]["UI_AFFECTING"] = [c for c in pol["impact_matrix"]["UI_AFFECTING"]
                                                if c != "actual_playwright"]
        json.dump(pol, open(p, "w"))
        ptr = os.path.join(self.tmp, "ptr.json"); pt = tbf_lib.load_json(POINTER)
        pt["policy_digest"] = tbf_lib.sha256_file(p)  # attacker also updates digest
        json.dump(pt, open(ptr, "w"))
        ok, errs = tbf_lib.validate_policy_integrity(p, ptr)
        self.assertFalse(ok); self.assertTrue(any("WEAKENED" in e for e in errs))

    # 24 authorized amendment still requires mutation proof (amendment.requires enforced)
    def test_24_amendment_requires_mutation(self):
        p = os.path.join(self.tmp, "amend.json"); pol = tbf_lib.load_policy(POLICY)
        pol["amendment"]["requires"] = [r for r in pol["amendment"]["requires"] if r != "mutation_proof"]
        json.dump(pol, open(p, "w"))
        ptr = os.path.join(self.tmp, "ptr.json"); pt = tbf_lib.load_json(POINTER)
        pt["policy_digest"] = tbf_lib.sha256_file(p); json.dump(pt, open(ptr, "w"))
        ok, errs = tbf_lib.validate_policy_integrity(p, ptr)
        self.assertFalse(ok); self.assertTrue(any("mutation_proof" in e for e in errs))

    # 25 historical evidence cannot satisfy a current exact-SHA obligation
    def test_25_historical_evidence(self):
        lane, man, root = complete_ui(self.tmp)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, tbf_lib.derive_required(["UI_AFFECTING"], POL), "c" * 40)
        self.assertFalse(ok); self.assertTrue(any("candidate_sha" in e for e in errs))

    # 26 headed local proof cannot substitute for CI (removing CI still blocks even with headed present)
    def test_26_headed_not_ci(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "headless_exact_sha_ci"]
        # headed_local_browser is still present
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("headless_exact_sha_ci" in e for e in errs))

    # 27 CI cannot substitute for headed local proof (removing headed still blocks with CI present)
    def test_27_ci_not_headed(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "headed_local_browser"]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertTrue(any("headed_local_browser" in e for e in errs))

    # 28 screenshot alone cannot satisfy a UI obligation
    def test_28_screenshot_alone(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] == "screenshots"]
        derived = tbf_lib.derive_required(["UI_AFFECTING"], POL)
        ok, errs = tbf_lib.validate_evidence(man, POL, root, derived, CANDIDATE)
        self.assertFalse(ok); self.assertGreater(len(errs), 3)

    # 29 founder witness cannot substitute for missing machine tests
    def test_29_founder_not_substitute(self):
        lane, man, root = complete_ui(self.tmp)
        man["tests"] = [t for t in man["tests"] if t["class"] != "actual_playwright"]
        man["founder_witness_or_signature"] = True  # founder says ok, but machine test missing
        state, _ = tbf_lib.derive_witness_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE)
        self.assertEqual(state, "MACHINE_VERIFICATION_BLOCKED")

    # 30 complete compliant UI lane becomes READY_FOR_HUMAN_PERCEPTION_WITNESS
    def test_30_complete_ready(self):
        lane, man, root = complete_ui(self.tmp)
        state, errs = tbf_lib.derive_witness_readiness(lane, man, POL, root, POLICY, POINTER, CANDIDATE)
        self.assertEqual(state, "READY_FOR_HUMAN_PERCEPTION_WITNESS", errs)


if __name__ == "__main__":
    unittest.main(verbosity=2)
