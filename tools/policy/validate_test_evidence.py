#!/usr/bin/env python3
"""Validate a test-evidence manifest: files exist, hashes verify, required tests PASS, SHA bound."""
import sys, argparse
from _common import POLICY, POINTER, REPO, die
import tbf_lib
ap = argparse.ArgumentParser(); ap.add_argument("manifest"); ap.add_argument("lane")
ap.add_argument("--candidate-sha", required=True); ap.add_argument("--repo-root", default=REPO)
ap.add_argument("--policy", default=POLICY); ap.add_argument("--pointer", default=POINTER)
a = ap.parse_args()
policy = tbf_lib.load_policy(a.policy)
lane = tbf_lib.load_json(a.lane); manifest = tbf_lib.load_json(a.manifest)
ok_l, err_l, derived = tbf_lib.validate_lane(lane, policy, a.policy, a.pointer)
if not ok_l:
    die(False, ["lane invalid:"] + err_l, "test_evidence")
ok, errors = tbf_lib.validate_evidence(manifest, policy, a.repo_root, derived, a.candidate_sha)
die(ok, errors, "test_evidence")
