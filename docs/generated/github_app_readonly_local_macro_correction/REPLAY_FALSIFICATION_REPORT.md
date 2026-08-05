# Replay Falsification Report (Correction B)
Replay now validates 26 prohibited safety fields (`PROHIBITED_FLAGS`) and fails closed. The self-test independently sets EACH prohibited field to:
- **true** → HOLD_REPLAY_MISMATCH (all 26);
- **missing** (deleted, re-sealed digest) → HOLD_REPLAY_MISMATCH (all 26);
- **malformed** (non-boolean) → HOLD_REPLAY_MISMATCH (all 26).
A digest-valid but unsafe record NEVER returns a verified status. Also verified: tampered digest → HOLD_REPLAY_MISMATCH; sim `claims_live_proof:true`/`github_app_proven:true` → HOLD_CONTRADICTORY_EVIDENCE; secret material in the record → HOLD_CONTRADICTORY_EVIDENCE; unaccepted cleanup value → HOLD_REPLAY_MISMATCH. Local simulation can never become live proof (only REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY). Self-test 13/13.
