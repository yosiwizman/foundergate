#!/usr/bin/env python3
"""ARLC-1 controller test suite — 40 named cases + mutations.

Run: python3 tools/terminal0/tests/test_arlc.py
Exit 0 == all pass; non-zero == failure count. No external deps.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import arlc_lib as A  # noqa: E402

FAIL = []
N = 0


def check(name, cond):
    global N
    N += 1
    if not cond:
        FAIL.append(name)
        print(f"  FAIL  {name}")
    else:
        print(f"  ok    {name}")


def all_true_merge_facts():
    return {k: True for k in A.MERGE_REQUIRED_TRUE} | {k: False for k in A.MERGE_ANY_TRUE_DENIES}


# --- Classification (1-10) ---
check("01 merge is operational", A.classify_action("merge_qualified_cumulative_pr_to_main") == "OPERATIONAL_AUTONOMOUS")
check("02 close superseded is operational", A.classify_action("close_superseded_pr") == "OPERATIONAL_AUTONOMOUS")
check("03 delete branch is operational", A.classify_action("delete_branch_fully_in_main") == "OPERATIONAL_AUTONOMOUS")
check("04 adopt provider is founder gate", A.classify_action("adopt_provider_as_default") == "TRUE_FOUNDER_GATE")
check("05 production deploy is founder gate", A.classify_action("production_deployment") == "TRUE_FOUNDER_GATE")
check("06 payments is founder gate", A.classify_action("enable_payments") == "TRUE_FOUNDER_GATE")
check("07 akior access is founder gate", A.classify_action("grant_akior_access") == "TRUE_FOUNDER_GATE")
check("08 legal terms is human expert", A.classify_action("accept_legal_terms") == "HUMAN_EXPERT_GATE")
check("09 UNKNOWN fails closed", A.classify_action("frobnicate_the_widget") == "TRUE_FOUNDER_GATE")
check("10 empty/None fails closed", A.classify_action("") == "TRUE_FOUNDER_GATE" and A.classify_action(None) == "TRUE_FOUNDER_GATE")

# --- Precedence (11-16) ---
check("11 safety floor beats founder", A.resolve_precedence({"hard_safety_floor": "STOP", "explicit_founder_instruction": "GO"})[0] == "hard_safety_floor")
check("12 founder beats disk policy", A.resolve_precedence({"explicit_founder_instruction": "GO", "disk_policy": "no"})[0] == "explicit_founder_instruction")
check("13 disk policy beats task prompt", A.resolve_precedence({"disk_policy": "x", "task_prompt": "y"})[0] == "disk_policy")
check("14 task prompt beats advisor", A.resolve_precedence({"task_prompt": "x", "advisor_narrative": "y"})[0] == "task_prompt")
check("15 advisor beats chat memory", A.resolve_precedence({"advisor_narrative": "x", "chat_memory": "y"})[0] == "advisor_narrative")
check("16 none when empty", A.resolve_precedence({})[0] == "none")

# --- Separation of duties (17-23) ---
check("17 clean roles ok", A.separation_of_duties_ok({"MOD-018": {"evaluate_eligibility"}, "MOD-022": {"execute_merge"}})[0] is True)
check("18 evaluate+execute forbidden", A.separation_of_duties_ok({"X": {"evaluate_eligibility", "execute_merge"}})[0] is False)
check("19 execute+certify forbidden", A.separation_of_duties_ok({"X": {"execute_merge", "certify_merge"}})[0] is False)
check("20 build+approve forbidden", A.separation_of_duties_ok({"X": {"build_candidate", "approve_candidate"}})[0] is False)
check("21 approve+certify forbidden", A.separation_of_duties_ok({"X": {"approve_candidate", "certify_candidate"}})[0] is False)
check("22 violation names component", "X" in A.separation_of_duties_ok({"X": {"execute_merge", "certify_merge"}})[1][0])
check("23 duties split across comps ok", A.separation_of_duties_ok({"A": {"build_candidate"}, "B": {"approve_candidate"}})[0] is True)

# --- Merge eligibility (24-34) ---
check("24 all-true operational is eligible", A.evaluate_merge_eligibility("merge_qualified_cumulative_pr_to_main", all_true_merge_facts()).eligible is True)
for i, k in enumerate(["checker_clean", "advisor_ready", "exact_sha_ci_green", "evaluated_head_matches_live_head"]):
    f = all_true_merge_facts(); f[k] = False
    check(f"25.{i} missing {k} blocks", A.evaluate_merge_eligibility("merge_qualified_cumulative_pr_to_main", f).eligible is False)
f = all_true_merge_facts(); f["forbidden_artifact_present"] = True
check("29 forbidden artifact denies", A.evaluate_merge_eligibility("merge_qualified_cumulative_pr_to_main", f).eligible is False)
f = all_true_merge_facts(); f["candidate_head_drifted"] = True
check("30 head drift denies", A.evaluate_merge_eligibility("merge_qualified_cumulative_pr_to_main", f).eligible is False)
f = all_true_merge_facts(); f["active_embargo_present"] = True
check("31 active embargo denies", A.evaluate_merge_eligibility("merge_qualified_cumulative_pr_to_main", f).eligible is False)
f = all_true_merge_facts(); f["would_weaken_safety_floor"] = True
check("32 weakening floor denies", A.evaluate_merge_eligibility("merge_qualified_cumulative_pr_to_main", f).eligible is False)
check("33 non-operational action never eligible", A.evaluate_merge_eligibility("production_deployment", all_true_merge_facts()).eligible is False)
check("34 empty facts fail closed", A.evaluate_merge_eligibility("merge_qualified_cumulative_pr_to_main", {}).eligible is False)

# --- Connector eligibility token (35-38) ---
SECRET = "test-secret"
DIG = "deadbeef"
tok = A.EligibilityToken.issue("abc123", "merge_commit", "MOD-018", DIG, SECRET)
check("35 token valid at matching head, diff executor", tok.valid_for("abc123", SECRET, "MOD-022")[0] is True)
check("36 token invalid on head drift", tok.valid_for("zzz999", SECRET, "MOD-022")[0] is False)
check("37 issuer cannot self-execute", tok.valid_for("abc123", SECRET, "MOD-018")[0] is False)
badtok = A.EligibilityToken.issue("abc123", "squash", "MOD-018", DIG, SECRET)
check("38 non-merge-commit method rejected", badtok.valid_for("abc123", SECRET, "MOD-022")[0] is False)

# --- No-loss cleanup (39-44) ---
check("39 branch in main deletable", A.branch_deletion_allowed("lane-x", True, False, False)[0] is True)
check("40 evidence branch preserved", A.branch_deletion_allowed("soak-evidence-vb2-x", True, True, False)[0] is False)
check("41 not-passed branch preserved", A.branch_deletion_allowed("soak-evidence-vb2-integrated-8h", True, False, True)[0] is False)
check("42 main never deleted", A.branch_deletion_allowed("main", True, False, False)[0] is False)
check("43 branch not in main kept", A.branch_deletion_allowed("lane-x", False, False, False)[0] is False)
check("44 worktree with unique changes kept", A.worktree_removal_allowed(True)[0] is False)

print(f"\nARLC-1 TESTS: {N - len(FAIL)}/{N} passed")
if FAIL:
    print("FAILED:", ", ".join(FAIL))
    sys.exit(len(FAIL))
sys.exit(0)
