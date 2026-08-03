# Outside Advisor Review Packet — Provider-Agnostic Harness (for ChatGPT)
- **Branch:** run/provider-agnostic-repo-builder-harness-20260803T1730ET (non-main) · **Base:** bea7fb7de395 · **Final head:** git rev-parse HEAD (see FINAL_STATUS.md)
- **Protected main:** origin/main 65fd01669f80 untouched · **PR #200:** untouched · prior evidence unmodified.

## Provider contract + adapters
provider_contract.mjs + 5 SIMULATED adapters (claude_code, codex_openai, hermes, local_shell, hostile) — no real API/keys/network/spend. gated-flow.mjs = FounderGate GATE (verifies; never trusts claim). repo_check.mjs = local allowlisted repo workflow.

## Test matrix (14 cases)
4 honest adapters → PASS_VERIFIED. Hostile: no-files→HOLD_MISSING_MANIFEST, wrong-preview→HOLD_PREVIEW_MISMATCH, missing-tests→HOLD_TEST_FAILURE, network/creds/deploy→REFUSED_FORBIDDEN_ACTION, readiness-claim→HOLD_NO_ARTIFACT_CLAIMED. Repo: local app + self-owned demo → OK; private repo → HELD.

## Evidence
Screenshots (9 distinct): provider_panel_overview + claude/codex/hermes/local_shell/hostile/repo/real_provider_blocked/private_repo_blocked · Video: video/*.webm.
Tests: gated-flow 17/17, repo-check 6/6, harness matrix OK, headed visible proof 7/7; regression wave11 14/14 + showroom 15/15. Scans clean.
Builder: no CLEAN · Checker: CLEAN_WITH_LIMITS · Terminal Advisor: PROVIDER_AGNOSTIC_HARNESS_READY_WITH_LIMITS.

## Remaining limits / not authorized
SIMULATED adapters only — NOT real OpenAI/Codex/Hermes integration. Local synthetic; no real provider/network/keys/spend. NOT production/SaaS/secure/customer/commercial. Private-repo access + real-provider activation each need a separate founder gate. Gate 8 blocked.

## Recommended next founder action
Founder decision: optionally authorize ONE real provider adapter (Gate-7-style budget cap + per-call authorization) and/or private-repo access under a founder gate — each a separate explicit founder phrase.
