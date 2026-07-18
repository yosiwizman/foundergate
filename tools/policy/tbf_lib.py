"""Test-Before-Founder (TBF-1) executable policy engine — shared library.

Evaluation-class governance code (oracle-anchored change control per
docs/contracts/component-classification.md). It reads the disk policy + a lane contract +
a test-evidence manifest and DERIVES witness-readiness and merge-readiness. It never trusts a
builder/UI-declared readiness; readiness is derived from disk evidence only. UNKNOWN fails
closed; STALE is not current; a builder statement is not independent verification.

Standard library only. No network. No repository execution.
"""
from __future__ import annotations

import hashlib
import json
import os
from typing import Any

POLICY_ID = "test-before-founder"

# --- impact classes -------------------------------------------------------------------- #
IMPACT_CLASSES = {
    "DOCUMENTATION_ONLY", "UI_AFFECTING", "API_AFFECTING", "RUNTIME_AFFECTING",
    "DATA_AFFECTING", "RECOVERY_AFFECTING", "SECURITY_BOUNDARY_AFFECTING",
    "GATE_OR_AUTHORITY_AFFECTING", "DEPENDENCY_AFFECTING", "PROVIDER_AFFECTING",
    "LIVE_ACTION_AFFECTING", "PRODUCTION_AFFECTING", "UNKNOWN",
}

# --- NON-WEAKENABLE INVARIANTS (the oracle floor) -------------------------------------- #
# The disk policy's matrix must AT LEAST require these per impact. Removing/weakening any of
# them makes validate_policy_integrity FAIL regardless of the digest — this is the mutation
# guard against silent weakening. Changing this floor is an evaluation-class amendment.
UI_FLOOR = {
    "actual_playwright", "headed_local_browser", "headless_exact_sha_ci", "screenshots",
    "automated_accessibility", "initial_neutral_state", "false_green", "independent_checker",
    "final_advisor_before_acceptance_witness",
    "foreground_founder_surface",  # FFS-1: a real foreground-visible founder-browser run is required
}
RUNTIME_FLOOR = {"unit", "crash_recovery", "teardown", "cleanup", "exact_version_proof", "independent_checker"}
GATE_FLOOR = {"unauthorized_path", "mutation_gate_fires", "independent_checker"}
SECURITY_FLOOR = {"deny_path", "bypass_attempts", "mutation", "secret_scan", "independent_adversarial_checker"}

# reasons under which a NON-required test class may be marked NOT_APPLICABLE
ALLOWED_NA_REASONS = {
    "no_rendered_surface", "no_runtime_surface", "no_api_surface", "no_data_layer",
    "no_external_dependency", "no_security_boundary", "no_authority_gate",
    "no_live_action", "no_production_surface", "documentation_only_no_execution",
}

TERMINAL_BAD_STATUSES = {"UNKNOWN", "STALE", "NOT_PASSED", "FAILED", "MISSING", "BLOCKED"}

# Classes NOT satisfied by a file-evidence entry: independent-review classes (satisfied by the
# checker/advisor fields) and conditional classes (only required when their condition applies).
# They are still counted as required at lane level; evidence-file presence is not demanded here.
META_CLASSES = {
    "independent_checker", "independent_adversarial_checker",
    "final_advisor_before_acceptance_witness", "independent_doc_review_if_governance",
    "founder_signature_where_required", "explicit_founder_gate", "no_inferred_authority",
    "human_expert_review_where_required", "all_lower_layer",
    "bounded_live_runtime_where_authorized", "schema_validation_where_applicable",
    "reduced_motion_where_applicable", "video_acceptance_critical",
    "backup_restore_where_applicable", "authz_where_applicable",
}


class PolicyError(Exception):
    ...


# --- loading + digest ------------------------------------------------------------------ #
def sha256_file(path: str) -> str:
    with open(path, "rb") as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def load_policy(policy_path: str) -> dict:
    return load_json(policy_path)


def derive_required(impacts: list, policy: dict) -> tuple:
    """Union of required test classes across impacts. UNKNOWN fails closed (returns None)."""
    matrix = policy.get("impact_matrix", {})
    if "UNKNOWN" in impacts:
        return None  # fail closed
    req = set()
    for imp in impacts:
        req |= set(matrix.get(imp, []))
    return tuple(sorted(req))


# --- policy integrity + invariant floor ------------------------------------------------ #
def validate_policy_integrity(policy_path: str, pointer_path: str) -> tuple:
    errors = []
    if not os.path.exists(policy_path):
        return False, [f"policy missing: {policy_path}"]
    if not os.path.exists(pointer_path):
        return False, [f"pointer missing: {pointer_path}"]
    policy = load_policy(policy_path)
    pointer = load_json(pointer_path)

    digest = sha256_file(policy_path)
    if pointer.get("policy_digest") != digest:
        errors.append(f"digest mismatch: pointer={pointer.get('policy_digest')} actual={digest}")
    if pointer.get("policy_version") != policy.get("version"):
        errors.append("pointer/policy version mismatch")
    if pointer.get("state") not in {"DRAFT", "CHECKER_PENDING", "ACTIVE", "BLOCKED", "SUPERSEDED", "UNKNOWN"}:
        errors.append(f"illegal policy state {pointer.get('state')!r}")

    # --- non-weakenable invariant floor ---
    matrix = policy.get("impact_matrix", {})
    def floor(impact, needed):
        have = set(matrix.get(impact, []))
        missing = needed - have
        if missing:
            errors.append(f"WEAKENED: {impact} missing required {sorted(missing)}")
    floor("UI_AFFECTING", UI_FLOOR)
    floor("RUNTIME_AFFECTING", RUNTIME_FLOOR)
    floor("GATE_OR_AUTHORITY_AFFECTING", GATE_FLOOR)
    floor("SECURITY_BOUNDARY_AFFECTING", SECURITY_FLOOR)

    if policy.get("unknown_behavior") != "FAIL_CLOSED":
        errors.append("WEAKENED: unknown_behavior must be FAIL_CLOSED")
    if policy.get("stale_behavior") != "NOT_CURRENT":
        errors.append("WEAKENED: stale_behavior must be NOT_CURRENT")
    if not policy.get("evaluation_class", False):
        errors.append("WEAKENED: policy must be evaluation_class")
    w = policy.get("witness", {})
    if not w.get("readiness_derived_only", False):
        errors.append("WEAKENED: witness.readiness_derived_only must be true")
    if not w.get("builder_cannot_set", False):
        errors.append("WEAKENED: witness.builder_cannot_set must be true")
    if "READY_FOR_HUMAN_PERCEPTION_WITNESS" not in w.get("states", []):
        errors.append("WEAKENED: witness states missing READY_FOR_HUMAN_PERCEPTION_WITNESS")
    m = policy.get("merge", {})
    if not m.get("green_ci_alone_insufficient", False):
        errors.append("WEAKENED: merge.green_ci_alone_insufficient must be true")
    na = policy.get("not_applicable", {})
    if not na.get("required_test_cannot_be_na", False):
        errors.append("WEAKENED: not_applicable.required_test_cannot_be_na must be true")
    amend = set(policy.get("amendment", {}).get("requires", []))
    for need in ("founder_signature", "independent_checker", "mutation_proof", "exact_sha_ci"):
        if need not in amend:
            errors.append(f"WEAKENED: amendment.requires missing {need}")
    return (len(errors) == 0), errors


# --- lane obligations ------------------------------------------------------------------ #
def validate_lane(lane: dict, policy: dict, policy_path: str, pointer_path: str) -> tuple:
    errors = []
    if lane.get("policy_version") != policy.get("version"):
        errors.append("lane policy_version mismatch")
    if lane.get("policy_digest") != sha256_file(policy_path):
        errors.append("lane policy_digest mismatch (stale or forged)")
    impacts = lane.get("impact_classes", [])
    if not impacts:
        errors.append("no impact_classes declared")
    for i in impacts:
        if i not in IMPACT_CLASSES:
            errors.append(f"illegal impact {i!r}")
    if "UNKNOWN" in impacts:
        errors.append("UNKNOWN impact fails closed — lane blocked")
    derived = derive_required(impacts, policy)
    if derived is None:
        return False, errors + ["required tests cannot be derived (UNKNOWN)"], None
    declared = set(lane.get("required_test_classes", []))
    if not set(derived).issubset(declared):
        errors.append(f"lane omits required tests: {sorted(set(derived) - declared)}")
    # not-applicable rules
    for na in lane.get("not_applicable", []):
        cls, reason = na.get("class"), na.get("reason")
        if cls in derived:
            errors.append(f"required test {cls!r} cannot be NOT_APPLICABLE")
        if reason not in ALLOWED_NA_REASONS:
            errors.append(f"invalid NOT_APPLICABLE reason {reason!r} for {cls!r}")
    return (len(errors) == 0), errors, derived


# --- evidence -------------------------------------------------------------------------- #
def validate_evidence(manifest: dict, policy: dict, repo_root: str,
                      required: tuple, candidate_sha: str) -> tuple:
    errors = []
    if manifest.get("candidate_sha") != candidate_sha:
        errors.append(f"evidence candidate_sha {manifest.get('candidate_sha')} != {candidate_sha}")
    tests = {t.get("class"): t for t in manifest.get("tests", [])}
    na = {n.get("class") for n in manifest.get("not_applicable", [])}
    for cls in required:
        if cls in META_CLASSES:
            continue  # satisfied by checker/advisor/founder fields or conditional
        if cls in na:
            errors.append(f"required test {cls!r} was marked NOT_APPLICABLE in evidence")
            continue
        t = tests.get(cls)
        if t is None:
            errors.append(f"missing evidence for required test {cls!r}")
            continue
        if t.get("status") != "PASS":
            errors.append(f"test {cls!r} status {t.get('status')!r} (not PASS)")
        # stale binding
        if t.get("sha") not in (None, candidate_sha):
            errors.append(f"test {cls!r} bound to stale SHA {t.get('sha')}")
        # evidence file existence + hash
        for ev in t.get("evidence", []):
            p = os.path.join(repo_root, ev.get("path", ""))
            if not os.path.exists(p):
                errors.append(f"evidence file missing: {ev.get('path')}")
                continue
            if ev.get("sha256") and sha256_file(p) != ev["sha256"]:
                errors.append(f"evidence hash mismatch: {ev.get('path')}")
    # no bad statuses anywhere in required
    return (len(errors) == 0), errors


# --- readiness derivations (ONLY these set READY) -------------------------------------- #
def derive_witness_readiness(lane: dict, manifest: dict, policy: dict, repo_root: str,
                             policy_path: str, pointer_path: str, candidate_sha: str) -> tuple:
    ok_pol, pol_err = validate_policy_integrity(policy_path, pointer_path)
    if not ok_pol:
        return "MACHINE_VERIFICATION_BLOCKED", pol_err
    ok_lane, lane_err, derived = validate_lane(lane, policy, policy_path, pointer_path)
    if not ok_lane:
        return "MACHINE_VERIFICATION_BLOCKED", lane_err
    ok_ev, ev_err = validate_evidence(manifest, policy, repo_root, derived, candidate_sha)
    if not ok_ev:
        return "MACHINE_VERIFICATION_BLOCKED", ev_err
    # independent checker + advisor where required by impacts
    reqset = set(derived)
    if "independent_checker" in reqset or "independent_adversarial_checker" in reqset:
        if (manifest.get("checker", {}) or {}).get("verdict") not in ("CLEAN", "TBF-CHECKER-CLEAN",
                                                                      "LAUNCHER-CHECKER-CLEAN"):
            return "MACHINE_VERIFICATION_BLOCKED", ["independent checker not CLEAN"]
    if "final_advisor_before_acceptance_witness" in reqset:
        if not (manifest.get("advisor", {}) or {}).get("present"):
            return "MACHINE_VERIFICATION_BLOCKED", ["final Advisor audit missing"]
    # FFS-1: a founder-facing UI lane cannot be READY without a VERIFIED foreground-founder-surface run.
    if "foreground_founder_surface" in reqset:
        import foreground_validate
        ok_fg, fg_err = foreground_validate.verify_from_manifest(manifest, repo_root)
        if not ok_fg:
            return "MACHINE_VERIFICATION_BLOCKED", fg_err
    # a manifest may NOT self-declare readiness; if it tries and it disagrees, reject
    claimed = manifest.get("declared_witness_readiness")
    if claimed and claimed != "READY_FOR_HUMAN_PERCEPTION_WITNESS":
        return "MACHINE_VERIFICATION_BLOCKED", [f"manifest self-declared {claimed}"]
    return "READY_FOR_HUMAN_PERCEPTION_WITNESS", []


def derive_merge_readiness(lane: dict, manifest: dict, policy: dict, repo_root: str,
                           policy_path: str, pointer_path: str, candidate_sha: str,
                           pointer: dict) -> tuple:
    if pointer.get("state") != "ACTIVE":
        return "MERGE_BLOCKED", [f"policy not ACTIVE (state={pointer.get('state')})"]
    wstate, werr = derive_witness_readiness(lane, manifest, policy, repo_root,
                                            policy_path, pointer_path, candidate_sha)
    if wstate != "READY_FOR_HUMAN_PERCEPTION_WITNESS":
        return "MERGE_BLOCKED", ["witness not machine-ready"] + werr
    # green CI alone is NOT enough — require founder gate + decision packet where flagged
    if lane.get("founder_gate_required") and not manifest.get("founder_witness_or_signature"):
        return "MERGE_BLOCKED", ["founder witness/signature required but absent"]
    if not manifest.get("terminal0_decision_packet"):
        return "MERGE_BLOCKED", ["Terminal-0 decision packet missing"]
    if manifest.get("active_qualification_prohibits_merge"):
        return "MERGE_BLOCKED", ["an active qualification contract prohibits merge"]
    return "MERGE_READY", []
