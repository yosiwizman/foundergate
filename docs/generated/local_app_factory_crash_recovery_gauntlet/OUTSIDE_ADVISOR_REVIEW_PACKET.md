# Outside Advisor Review Packet — Crash / Recovery Gauntlet (for ChatGPT)
- **Branch:** run/local-app-factory-crash-recovery-gauntlet-20260803T1030ET (non-main) · **Base:** b9aaf0a9a1a8 · **Final head:** git rev-parse HEAD (see FINAL_STATUS.md)
- **Protected main:** origin/main 65fd01669f80 untouched · **PR #200:** untouched · Round 1/Round 2 evidence untouched.

## Crash fixtures (12) → classifications
F01 missing_manifest→HOLD_MISSING_MANIFEST (recovered) · F02 corrupted_manifest→HOLD_CORRUPTED_MANIFEST (recovered) · F03 hash_mismatch→HOLD_REQUEST_HASH_MISMATCH (held) · F04 preview_mismatch→HOLD_PREVIEW_MISMATCH (recovered) · F05 test_failure→HOLD_TEST_FAILURE (held) · F06 missing_index→HOLD_PARTIAL_GENERATION (recovered) · F07 stale_round1→HOLD_STALE_EVIDENCE (held) · F08 stale_round2→HOLD_STALE_EVIDENCE (held) · F09 unsupported→HOLD_UNSUPPORTED_OR_UNSAFE (held) · F10 server_unavailable→HOLD_SERVER_UNAVAILABLE (recovered) · F11 partial_generation→HOLD_PARTIAL_GENERATION (recovered) · F12 post_checker_mutation→HOLD_POST_CHECKER_MUTATION (held).
**12 HELD · 6 recovered · 0 shown green · all previews blocked.**

## Evidence
Screenshots (7): crash_panel_overview + missing_manifest/wrong_preview/test_failure/stale_evidence holds + recovered_manifest + recovered_server · Video: video/*.webm.
Tests: crash-fixtures 14/14, false-green-hostile 10/10, unsupported 16/16, headed visible proof 5/5; regression wave11 14/14 + round2 proof 10/10.
Builder: BUILDER_REPORT (no CLEAN) · Checker: CLEAN_WITH_LIMITS · Terminal Advisor: CRASH_RECOVERY_PROVEN_WITH_LIMITS.

## Remaining limits / not authorized
Fixed classifier over fixed archetypes; recovery only where deterministically reconstructable; server-down is an isolated unreachable-endpoint injection. Local synthetic only; NOT production/SaaS/secure/customer/commercial. No Gate 8. No deploy/bill/provider/outreach/real data/private repos/PR mutation/merge.

## Recommended next founder action
UI simplification (make the Crash Test + factory panels legible to a non-developer founder), then external-evaluator prep. No code change/deploy/Gate-8 step needed.
