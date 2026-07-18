import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
POLICY = os.path.join(REPO, ".foundergate", "policies", "test_before_founder.json")
POINTER = os.path.join(REPO, ".foundergate", "state", "test_before_founder_policy_pointer.json")
def die(ok, errors, label):
    if ok:
        print(f"{label}: PASS")
        sys.exit(0)
    print(f"{label}: FAIL")
    for e in errors:
        print("  -", e)
    sys.exit(1)
