#!/usr/bin/env python3
"""Validate TBF-1 policy integrity: digest matches pointer + non-weakenable invariant floor."""
import sys, argparse
from _common import POLICY, POINTER, die
import tbf_lib
ap = argparse.ArgumentParser(); ap.add_argument("--policy", default=POLICY); ap.add_argument("--pointer", default=POINTER)
a = ap.parse_args()
ok, errors = tbf_lib.validate_policy_integrity(a.policy, a.pointer)
die(ok, errors, "policy_integrity")
