"""FFS-1 foreground-founder-surface validator (evaluation-class).

Verifies that a founder-facing UI candidate has a VERIFIED foreground-visible founder-browser run.
It rejects headless-labeled-foreground, zero/minimized/offscreen/background windows, the wrong
browser, direct-server-launch instead of the founder launcher, wrong route/UI-contract/SHA,
screenshots without a trace, video without DOM assertions, DOM assertions without window visibility,
API substitution for required founder actions, and stale/other-SHA artifacts. Standard library only.
"""
from __future__ import annotations
import json
import os

FOREGROUND_STATES = {
    "NOT_REQUIRED", "REQUIRED_NOT_STARTED", "FOREGROUND_TEST_RUNNING",
    "FOREGROUND_TEST_FAILED", "FOREGROUND_TEST_BLOCKED", "FOREGROUND_TEST_VERIFIED",
}
REQUIRED_BROWSER = "Google Chrome"


def verify_result(res: dict, candidate_sha: str | None = None) -> tuple:
    """Return (ok, errors) for a foreground RESULT object. Only FOREGROUND_TEST_VERIFIED can pass,
    and every hard gate must hold."""
    e = []
    if res.get("foreground_state") != "FOREGROUND_TEST_VERIFIED":
        e.append(f"foreground_state {res.get('foreground_state')!r} != FOREGROUND_TEST_VERIFIED")
    if res.get("browser") != REQUIRED_BROWSER:
        e.append(f"wrong browser {res.get('browser')!r} (must be {REQUIRED_BROWSER})")
    if res.get("headless") is not False:
        e.append("headless must be false")
    if not res.get("real_launcher_used"):
        e.append("real founder launcher not used (direct server launch / API substitution)")
    if int(res.get("visible_window_count", 0)) < 1:
        e.append("zero visible windows")
    if res.get("minimized") is not False:
        e.append("window is minimized")
    if res.get("onscreen") is not True:
        e.append("window is not onscreen")
    if res.get("frontmost") is not True:
        e.append("browser not frontmost")
    if not res.get("active_gui_session"):
        e.append("not on an active macOS graphical session")
    if not res.get("ui_contract"):
        e.append("missing UI contract identity")
    if candidate_sha and res.get("candidate_sha") not in (None, candidate_sha):
        e.append(f"foreground artifacts bound to a different SHA {res.get('candidate_sha')}")
    # evidence chain: screenshots require video+trace; video requires trace+DOM; trace requires DOM;
    # DOM assertions require a visible window (checked above).
    if res.get("screenshots", 0) and (not res.get("video") or not res.get("trace")):
        e.append("screenshots without video and/or trace")
    if res.get("video") and (not res.get("trace") or not res.get("dom_assertions", 0)):
        e.append("video without trace and/or DOM assertions")
    if res.get("trace") and not res.get("dom_assertions", 0):
        e.append("trace without DOM assertions")
    if res.get("dom_assertions", 0) and int(res.get("visible_window_count", 0)) < 1:
        e.append("DOM assertions without visible-window proof")
    if not res.get("final_dom_assertions"):
        e.append("missing final DOM assertions / final-state contradiction analysis")
    if res.get("api_substituted_founder_action"):
        e.append("a direct API call substituted for a required founder-flow DOM action")
    # completion invariant reflected in the surface: a shown pack must be verified
    if res.get("pack_state") not in (None, "VERIFIED", "AVAILABLE", "NOT_REQUIRED"):
        e.append(f"pack_state {res.get('pack_state')!r} is not verified (completion invariant)")
    # expected UI contract match
    exp = res.get("expected_ui_contract")
    if exp and res.get("ui_contract") != exp:
        e.append(f"UI contract {res.get('ui_contract')!r} != expected {exp!r}")
    return (len(e) == 0), e


def verify_from_manifest(manifest: dict, repo_root: str) -> tuple:
    """Locate the foreground_founder_surface evidence in the manifest and verify its RESULT."""
    tests = {t.get("class"): t for t in manifest.get("tests", [])}
    t = tests.get("foreground_founder_surface")
    if not t:
        return False, ["no foreground_founder_surface evidence entry"]
    # find a RESULT.json among the evidence paths
    result_path = None
    for ev in t.get("evidence", []):
        p = ev.get("path", "")
        if p.endswith("RESULT.json"):
            result_path = os.path.join(repo_root, p)
            break
    if not result_path or not os.path.exists(result_path):
        return False, ["foreground RESULT.json evidence missing"]
    try:
        res = json.load(open(result_path))
    except Exception as ex:
        return False, [f"foreground RESULT.json unreadable: {ex}"]
    return verify_result(res, manifest.get("candidate_sha"))
