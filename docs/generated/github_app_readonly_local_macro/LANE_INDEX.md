# Lane Index
| Lane | Objective | State | Evidence |
| --- | --- | --- | --- |
| W1 | GitHub App authority model | LANE_SELF_TESTED (13/13) | github_app_authority_model.* |
| W2 | Secret/key/token guard | LANE_SELF_TESTED (11/11) | github_app_secret_guard.*, GITHUB_APP_SECRET_HANDLING.* |
| W3 | Local token simulator | LANE_SELF_TESTED (8/8) | github_app_local_token_simulator.*, LOCAL_TOKEN_SIMULATOR_REPORT.md |
| W4 | Read-only intake contract | LANE_SELF_TESTED (7/7) | github_app_readonly_contract.*, GITHUB_APP_READONLY_CONTRACT.* |
| W5 | Refusal matrix | LANE_SELF_TESTED (34/34) | github_app_refusal_matrix.*, WRITE_AND_ABUSE_REFUSAL_* |
| W6 | Evidence replay | LANE_SELF_TESTED (6/6) | github_app_evidence_replay.*, EVIDENCE_REPLAY_REPORT.md |
| W7 | Founder UI panel | headed proof | github_app_visible_proof.mjs + screenshots |
| W8 | Local e2e journey | report | LOCAL_E2E_JOURNEY_REPORT.md |
| W9 | Claims/limits/PK V15 | docs | CLAIMS_AND_LIMITS.md, PROJECT_KNOWLEDGE_UPDATE_BUNDLE_V15_* |
| N1 | Live-action gate detector | NO_SIGNATURE_FOUND | PREFLIGHT (LIVE_GITHUB_APP_ACTION_AUTHORITY=false) |
