#!/usr/bin/env python3
"""ARLC-1 Autonomous Repository Lifecycle Controller — core library.

Machine-enforced law for routine, mechanically-qualified repository operations.
Pure, deterministic, disk-first. No network, no side effects: callers supply
observed facts; this library only classifies and decides. Separation of duties
is enforced structurally — a single component cannot discover, approve, execute
AND certify the same action.

Precedence (highest first) is fixed and non-reorderable by any caller:
    hard_safety_floor > explicit_founder_instruction > disk_policy >
    qualification_locks > derived_state > task_prompt > advisor_narrative >
    chat_memory
"""
from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass, field
from typing import Any

PRECEDENCE = (
    "hard_safety_floor",
    "explicit_founder_instruction",
    "disk_policy",
    "qualification_locks",
    "derived_state",
    "task_prompt",
    "advisor_narrative",
    "chat_memory",
)

# Non-weakenable floor: actions that ALWAYS require a founder/human gate,
# regardless of any lower-precedence signal. UNKNOWN also fails closed.
TRUE_FOUNDER_GATE_ACTIONS = frozenset({
    "adopt_provider_as_default",
    "execute_customer_or_private_repository",
    "production_deployment",
    "public_release",
    "enable_payments",
    "grant_akior_access",
    "authorize_new_live_runtime_run_without_standing_authority",
    "weaken_any_safety_floor_or_governance_invariant",
})
HUMAN_EXPERT_GATE_ACTIONS = frozenset({
    "accept_legal_terms",
    "modify_security_boundary",
    "sign_design_partner_agreement",
})
OPERATIONAL_AUTONOMOUS_ACTIONS = frozenset({
    "merge_qualified_cumulative_pr_to_main",
    "close_superseded_pr",
    "delete_branch_fully_in_main",
    "remove_worktree_no_unique_work",
    "post_merge_verification",
})

# Predicates every OPERATIONAL_AUTONOMOUS merge must satisfy.
MERGE_REQUIRED_TRUE = (
    "checker_clean",
    "advisor_ready",
    "exact_sha_ci_green",
    "evaluated_head_matches_live_head",
    "merge_method_is_merge_commit",
    "all_declared_ancestors_present",
    "product_tree_frozen_or_delta_authorized",
    "zero_forbidden_artifacts",
    "no_active_embargo",
    "separation_of_duties_satisfied",
)
MERGE_ANY_TRUE_DENIES = (
    "unknown_classification",
    "candidate_head_drifted",
    "forbidden_artifact_present",
    "ancestry_gap",
    "active_embargo_present",
    "ci_not_green_at_exact_sha",
    "would_weaken_safety_floor",
    "self_certification_detected",
)

FORBIDDEN_COMBINATIONS = (
    frozenset({"evaluate_eligibility", "execute_merge"}),
    frozenset({"execute_merge", "certify_merge"}),
    frozenset({"build_candidate", "approve_candidate"}),
    frozenset({"approve_candidate", "certify_candidate"}),
)

# Each duty belongs to exactly one stage category. Strict separation: a single
# component may hold duties in AT MOST ONE category — so it can never both
# produce/approve/execute AND certify the same lifecycle action. This is the
# authoritative encoding of "no component may self-certify the action it
# performed"; the pairwise FORBIDDEN_COMBINATIONS above are a documented subset.
DUTY_CATEGORY = {
    "build_candidate": "BUILD",
    "evaluate_eligibility": "APPROVE",
    "approve_candidate": "APPROVE",
    "execute_merge": "EXECUTE",
    "certify_candidate": "CERTIFY",
    "certify_merge": "CERTIFY",
}

# Branch names that are never deletable regardless of ancestry.
PROTECTED_BRANCHES = frozenset({"main", "master"})


def _normalize_branch(branch: Any) -> str | None:
    """Canonicalize a branch identifier; return None if empty/ambiguous."""
    if not isinstance(branch, str):
        return None
    n = branch.strip()
    if n.startswith("refs/heads/"):
        n = n[len("refs/heads/"):]
    n = n.strip()
    return n or None


class ClassificationError(Exception):
    pass


def classify_action(action: str) -> str:
    """Classify an action. UNKNOWN fails closed to TRUE_FOUNDER_GATE."""
    if not action or not isinstance(action, str):
        return "TRUE_FOUNDER_GATE"  # fail closed
    if action in TRUE_FOUNDER_GATE_ACTIONS:
        return "TRUE_FOUNDER_GATE"
    if action in HUMAN_EXPERT_GATE_ACTIONS:
        return "HUMAN_EXPERT_GATE"
    if action in OPERATIONAL_AUTONOMOUS_ACTIONS:
        return "OPERATIONAL_AUTONOMOUS"
    return "TRUE_FOUNDER_GATE"  # UNKNOWN -> fail closed


def resolve_precedence(signals: dict[str, Any]) -> tuple[str, Any]:
    """Return the (source, value) that wins by precedence.

    `signals` maps a precedence source name to its asserted value (or absent).
    A lower-precedence source can never override a higher one.
    """
    for source in PRECEDENCE:
        if source in signals and signals[source] is not None:
            return source, signals[source]
    return ("none", None)


def separation_of_duties_ok(component_actions: dict[str, set[str]]) -> tuple[bool, list[str]]:
    """True iff no single component holds a forbidden combination of duties.

    `component_actions` maps component id -> set of action-duties it performed.
    """
    violations: list[str] = []
    for comp, actions in component_actions.items():
        acts = set(actions)
        # Authoritative rule: at most one duty category per component.
        cats = {DUTY_CATEGORY[a] for a in acts if a in DUTY_CATEGORY}
        if len(cats) > 1:
            violations.append(f"{comp} spans duty categories {sorted(cats)} (self-certification risk)")
        # Explicit documented pairwise combos (subset; kept for clarity).
        for combo in FORBIDDEN_COMBINATIONS:
            if combo.issubset(acts):
                violations.append(f"{comp} holds forbidden combo {sorted(combo)}")
    return (len(violations) == 0, violations)


@dataclass
class MergeVerdict:
    eligible: bool
    action_class: str
    failed_required: list[str] = field(default_factory=list)
    triggered_denials: list[str] = field(default_factory=list)
    reason: str = ""


def evaluate_merge_eligibility(action: str, facts: dict[str, bool],
                               component_actions: dict[str, set[str]] | None = None) -> MergeVerdict:
    """Decide whether an autonomous merge is eligible.

    Fail-closed: any missing required fact is treated as False (not eligible);
    any denial predicate that is True blocks; non-operational class blocks.

    If `component_actions` is supplied, separation of duties is COMPUTED from it
    (the caller-asserted `separation_of_duties_satisfied` flag cannot override a
    real violation) — closing the "trust the flag" gap.
    """
    action_class = classify_action(action)
    if action_class != "OPERATIONAL_AUTONOMOUS":
        return MergeVerdict(
            eligible=False, action_class=action_class,
            reason=f"action '{action}' is {action_class}; not autonomously mergeable",
        )

    facts = dict(facts)
    if component_actions is not None:
        sod_ok, sod_violations = separation_of_duties_ok(component_actions)
        facts["separation_of_duties_satisfied"] = facts.get("separation_of_duties_satisfied", True) and sod_ok
        if not sod_ok:
            facts["self_certification_detected"] = True

    failed = [k for k in MERGE_REQUIRED_TRUE if not facts.get(k, False)]
    denials = [k for k in MERGE_ANY_TRUE_DENIES if facts.get(k, False)]
    eligible = (not failed) and (not denials)
    reason = "eligible" if eligible else "blocked: " + ", ".join(failed + denials)
    return MergeVerdict(
        eligible=eligible, action_class=action_class,
        failed_required=failed, triggered_denials=denials, reason=reason,
    )


@dataclass
class EligibilityToken:
    """Signed token MOD-018 issues to MOD-022. The connector may execute a
    merge ONLY when a token's evaluated_sha matches the live head exactly."""
    evaluated_sha: str
    merge_method: str
    issuing_component: str
    policy_digest: str
    signature: str

    @staticmethod
    def _sign(evaluated_sha: str, merge_method: str, issuing_component: str,
              policy_digest: str, secret: str) -> str:
        payload = f"{evaluated_sha}|{merge_method}|{issuing_component}|{policy_digest}"
        return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

    @staticmethod
    def issue(evaluated_sha: str, merge_method: str, issuing_component: str,
              policy_digest: str, secret: str) -> "EligibilityToken":
        sig = EligibilityToken._sign(evaluated_sha, merge_method, issuing_component, policy_digest, secret)
        return EligibilityToken(evaluated_sha, merge_method, issuing_component, policy_digest, sig)

    def valid_for(self, live_sha: str, secret: str, executing_component: str) -> tuple[bool, str]:
        if not self.evaluated_sha or not live_sha:
            return False, "empty SHA — fail closed"
        expect = EligibilityToken._sign(self.evaluated_sha, self.merge_method,
                                        self.issuing_component, self.policy_digest, secret)
        if not hmac.compare_digest(self.signature, expect):
            return False, "bad signature"
        if not hmac.compare_digest(self.evaluated_sha, live_sha):
            return False, f"head drift: token {self.evaluated_sha[:9]} != live {live_sha[:9]}"
        if self.issuing_component == executing_component:
            return False, "self-execution: issuer cannot also execute (separation of duties)"
        if self.merge_method != "merge_commit":
            return False, f"merge method {self.merge_method} not permitted"
        return True, "valid"


def branch_deletion_allowed(branch: Any, head_in_main: bool,
                            is_evidence: bool, is_not_passed: bool,
                            protected: set[str] | None = None) -> tuple[bool, str]:
    """No-loss cleanup: a branch may be deleted only if it is fully in main and
    is neither a protected trunk, an evidence branch, nor a not-passed branch.

    Fail-closed on empty/ambiguous names and on any protected trunk regardless
    of spelling (refs/heads/ prefix, trailing whitespace, case)."""
    n = _normalize_branch(branch)
    if n is None:
        return False, "empty/ambiguous branch name — fail closed"
    protected_set = {p.lower() for p in PROTECTED_BRANCHES}
    if protected:
        protected_set |= {(_normalize_branch(p) or "").lower() for p in protected}
    if n.lower() in protected_set:
        return False, "protected trunk branch — never delete"
    if is_evidence or n.startswith("soak-evidence-"):
        return False, "evidence branch preserved"
    if is_not_passed:
        return False, "not-passed evidence branch preserved"
    if not head_in_main:
        return False, "head not an ancestor of main (would lose work)"
    return True, "deletable (fully in main, not evidence)"


def worktree_removal_allowed(has_unique_tracked_changes: bool) -> tuple[bool, str]:
    if has_unique_tracked_changes:
        return False, "kept: unique tracked uncommitted changes"
    return True, "removable (no unique tracked work)"


def sha256_of_file(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def load_policy(path: str) -> dict:
    with open(path, "r") as f:
        return json.load(f)
