# Outside Advisor Review Packet — P0 Core IP + Assumption/Environment Verification (for ChatGPT)
- **Branch:** run/p0-core-ip-assumption-env-verification-20260803T1915ET (non-main) · **Base:** run/adoption-matrix-p1-assurance-core @ 34892afca65e · **Final head:** see FINAL_STATUS.md.
- **Protected main:** origin/main 65fd01669f80 untouched · **PR #200:** OPEN/draft untouched.

## P0 map + merged adoption matrix
P0_CORE_IP_MAP.md (all P0 families mapped). FULL_ADOPTION_MATRIX_MERGED.md: Part 1 = new P0/P1/P2/P3 governance list (82 items, G001–G082, verbatim); Part 2 = prior 160-item P1–P10 carried forward (none dropped). New totals: INTEGRATED 65 · PARTIAL 14 · NOT_YET 2 · BLOCKED 1.

## Implemented modules (local, deterministic, no network/keys/spend)
core_ip/core-ip-primitives.mjs (46 primitives); assumption_verification/assumption-engine.mjs; environment_integrity/environment-integrity.mjs; execution_integrity/execution-integrity.mjs; boundary_monitoring/boundary-monitor.mjs; containment/containment-decision.mjs; assurance_core/evidence-confidence.mjs (evidence-only, NOT AI confidence); assurance_core/ai-assurance-records.mjs.

## Tests + falsification
7 selftests ALL GREEN (51 proofs). tests/core_ip/falsification.mjs = 20/20 fail-closed, 0 green (FALSIFICATION_REPORT.md).

## Visible browser proof
tests/e2e-dashboard/coreip-visible-proof.mjs = 11/11 headed. 8 screenshots (core_ip_panel, assumption_verification, environment_integrity, execution_integrity, boundary_monitoring, containment_decision, evidence_confidence, blocked_gates) + video.

## Claims/limits + maps + PK V4
CLAIMS_AND_LIMITS.md (no sandbox/production/customer/SaaS/security-cert/paid claims). COMMERCIAL_DIFFERENTIATOR_MAP.md + LONG_TERM_IP_MAP.md (mapped, NOT claimed). PROJECT_KNOWLEDGE_UPDATE_BUNDLE_V4.md (paste-ready; Claude cannot edit ChatGPT PK).

## Reviews
Checker: CLEAN_WITH_LIMITS · Terminal Advisor: P0_CORE_IP_READY_WITH_LIMITS.

## Remaining limits
Local synthetic; deterministic records. P0 primitives are a tested library, NOT yet the always-on outer controller. Env/exec = synthetic evidence, NOT real isolation/sandbox proof. Evaluation governance + model qualification = PLANNED_WITH_SCHEMA. Real provider / private repo / Gate 8 / deploy / bill / merge blocked — each needs an explicit founder phrase.

## Recommended next action
Promote the P0 library into the always-on outer controller (local) and/or continue P3 Security & Trust locally. Real-world milestone = one real provider adapter proof (founder gate; not authorized here).
