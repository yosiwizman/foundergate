# Project Knowledge Update Bundle — V8 (paste-ready for ChatGPT Project Knowledge)
> **Claude / Terminal cannot edit ChatGPT Project Knowledge directly.** Paste this in as the current source of truth. It supersedes V7.

## Anti-drift (read first)
- FounderGate is the deterministic GATE; any AI/provider is a replaceable worker that cannot self-certify.
- One real OpenAI call has now been proven through the gate — but everything is still LOCAL/bounded with limits. NOT production / SaaS / commercial / customer / paid ready; NOT security-certified; NOT "real provider support complete".
- Codex, any second/repeat real call, private repo, Gate 8, real hardware, deploy, bill, merge — all blocked; each needs an explicit founder phrase.

## New this run — REAL_OPENAI_PROVIDER_PROOF_READY_WITH_LIMITS
- Founder-authorized true gate: **exactly ONE real OpenAI API call** (gpt-5-nano, chat.completions), synthetic input only, budget cap $0.25.
- Result: call_count=1, http 200, actual cost **$0.00035445** (WITHIN_CAP), verifier **PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS** (FounderGate decided; provider could not self-certify), no retry, no second call, secret-scan clean (key never stored/printed/zipped; only key_last4 + fingerprint recorded).
- New gate modules: openai_provider_gate (one-call + refusals), openai_cost_guard ($0.25 cap, fail-closed), openai_redaction (+secret scan), openai_real_provider_adapter (env key only, dry-run), openai_response_verifier (provider output is not acceptance).
- Pre-call tests 24 proofs (15 hostile) passed BEFORE the call. New "Real Provider Gate" dashboard panel; headed proof 11/11 + 4 screenshots. Checker CLEAN_WITH_LIMITS; Gate Advisor REAL_PROVIDER_PROOF_READY_WITH_LIMITS.

## Current completed local stack (with limits)
Provider harness → P1 Assurance Core → P0 Core IP → P0.2 Outer Controller+Env Gauntlet → P0.3 Physical Containment Model → Harvest Macro (W1–W8) → **Real OpenAI Provider Proof (one bounded call)**.

## Next recommended step (founder's choice)
- Small bounded repeat/batch of OpenAI calls (coverage), OR private-repo read-only proof — both low-risk, founder-gated. Codex / Gate 8 / protected-main merge higher-stakes. Paste this V8 into ChatGPT PK.
