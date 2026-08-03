# Project Knowledge Update Bundle — V4 (paste-ready for ChatGPT Project Knowledge)

> **Claude cannot edit ChatGPT Project Knowledge directly.** Paste this in as the current source of truth. It supersedes prior bundles.

## Anti-drift (read first)
- FounderGate is the **GATE** / deterministic outer controller; any AI/provider is a **replaceable worker**. A provider's claim is **never proof**.
- Evidence confidence is computed from **evidence, NOT from AI confidence**.
- Everything is **LOCAL / SYNTHETIC with limits**. Nothing is production / SaaS / customer / paid / security-certified — none of these is claimed.
- Environment/execution integrity are local **synthetic evidence records**, NOT a proof of real sandbox/network/container security.
- Real provider activation, private repo access, and Gate 8 are **blocked**; each needs an explicit founder authorization phrase.

## Roadmap status (updated 2026-08-03, after the P0 Core IP run)
- Local proofs (with limits): app factory, repeatability, crash recovery, Founder Drive Mode, showroom, provider-agnostic simulated harness, P1 Assurance Core, and now **P0 Core IP + Assumption/Environment/Execution Verification**.
- Gates 1–7 accepted with limits; Aug-3 arc complete-with-limits but not yet founder-accepted; Gate 8 blocked.

## P0 Core IP added
- `src/core_ip/core-ip-primitives.mjs` — 46 deterministic primitives (evidence-over-self-report, exact-state binding, staleness, producer/verifier disagreement, baseline/candidate, discriminating tests, acceptance predicates, failure fingerprinting + retry budgets, no-progress/churn, durable planning, admission control, scope governance, runtime governance, inner/outer loop, human authority outside the AI loop). Self-test 23/23; falsification 20/20 fail-closed.

## Assumption Verification Engine added
- `src/assumption_verification/assumption-engine.mjs` — declares assumptions, verifies each (VERIFIED/UNKNOWN/STALE/VIOLATED/MONITORING_REQUIRED) with expiration + violation action, and packages results ("10 assumptions declared; 10 verified; 0 violations; evidence package generated").

## Environment / Execution Integrity added
- `src/environment_integrity/environment-integrity.mjs` (VERIFIED_LOCAL/BLOCKED/UNKNOWN/STALE/VIOLATION + environment seal) and `src/execution_integrity/execution-integrity.mjs` (fails closed on missing evidence). Plus `src/boundary_monitoring/boundary-monitor.mjs` and `src/containment/containment-decision.mjs`.

## P1 AI Assurance status
- `src/assurance_core/ai-assurance-records.mjs` + `evidence-confidence.mjs` — context provenance, AI config manifest, threat-model governance (INTEGRATED local); evaluation governance + model qualification = PLANNED_WITH_SCHEMA (no real dataset/provider).

## P2 / P3 maps
- Commercial differentiators + long-term IP mapped, NOT commercially claimed. See COMMERCIAL_DIFFERENTIATOR_MAP.md + LONG_TERM_IP_MAP.md.

## What remains partial
- Deterministic outer controller is a proven tested local library — NOT yet the always-on runtime driver. Evaluation governance + model qualification planned. Real isolation/sandbox NOT proven.

## Blocked gates (unchanged)
- real provider activation — blocked; private repo access — blocked; Gate 8 — blocked; deploy/bill/outreach/customer-data/merge — blocked.

## Next recommended step (founder's choice)
- Wire the P0 primitives as the always-on outer controller around a run (local, no gate), OR continue P3 security-trust locally. Real-world milestone = one real provider adapter proof (founder gate; not authorized here).
