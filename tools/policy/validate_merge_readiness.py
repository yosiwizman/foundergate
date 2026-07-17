#!/usr/bin/env python3
"""Derive merge readiness. Green CI alone never grants it."""
import sys, argparse
from _common import POLICY, POINTER, REPO
import tbf_lib
ap = argparse.ArgumentParser(); ap.add_argument("lane"); ap.add_argument("manifest")
ap.add_argument("--candidate-sha", required=True); ap.add_argument("--repo-root", default=REPO)
ap.add_argument("--policy", default=POLICY); ap.add_argument("--pointer", default=POINTER)
a = ap.parse_args()
policy = tbf_lib.load_policy(a.policy); pointer = tbf_lib.load_json(a.pointer)
lane = tbf_lib.load_json(a.lane); manifest = tbf_lib.load_json(a.manifest)
state, reasons = tbf_lib.derive_merge_readiness(lane, manifest, policy, a.repo_root, a.policy, a.pointer, a.candidate_sha, pointer)
print(f"merge_readiness: {state}")
for r in reasons: print("  -", r)
sys.exit(0 if state == "MERGE_READY" else 1)
