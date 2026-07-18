#!/usr/bin/env python3
"""Validate a lane contract against the active policy (impacts -> required tests, NA rules)."""
import sys, argparse
from _common import POLICY, POINTER, die
import tbf_lib
ap = argparse.ArgumentParser(); ap.add_argument("lane"); ap.add_argument("--policy", default=POLICY); ap.add_argument("--pointer", default=POINTER)
a = ap.parse_args()
policy = tbf_lib.load_policy(a.policy)
lane = tbf_lib.load_json(a.lane)
ok, errors, derived = tbf_lib.validate_lane(lane, policy, a.policy, a.pointer)
die(ok, errors, "lane_test_obligations")
