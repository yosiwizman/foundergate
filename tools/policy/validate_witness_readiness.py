#!/usr/bin/env python3
"""Derive witness readiness from disk evidence. ONLY this tool may output READY."""
import sys, argparse
from _common import POLICY, POINTER, REPO
import tbf_lib
ap = argparse.ArgumentParser(); ap.add_argument("lane"); ap.add_argument("manifest")
ap.add_argument("--candidate-sha", required=True); ap.add_argument("--repo-root", default=REPO)
ap.add_argument("--policy", default=POLICY); ap.add_argument("--pointer", default=POINTER)
a = ap.parse_args()
policy = tbf_lib.load_policy(a.policy)
lane = tbf_lib.load_json(a.lane); manifest = tbf_lib.load_json(a.manifest)
state, reasons = tbf_lib.derive_witness_readiness(lane, manifest, policy, a.repo_root, a.policy, a.pointer, a.candidate_sha)
print(f"witness_readiness: {state}")
for r in reasons: print("  -", r)
sys.exit(0 if state == "READY_FOR_HUMAN_PERCEPTION_WITNESS" else 1)
