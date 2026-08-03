# Recovery Flow
Recovery is attempted ONLY where the artifact can be mechanically reconstructed, and never rewrites history:
each fixture keeps its ORIGINAL failure classification plus the recovery action + post-recovery result.
- Missing/corrupted manifest (F01/F02): source archetype is deterministic → regenerate app + manifest → re-classify OK → retest PASS.
- Preview mismatch (F04): rebind preview_url to own app folder → OK.
- Missing index / partial generation (F06/F11): clean isolated fixture → regenerate → OK → retest PASS.
- Server unavailable (F10): verify the owned local server is reachable, re-check preview → OK. (Isolated unreachable-endpoint injection; the shared demo server was not killed.)
- Stale evidence (F07/F08): NOT recovered — reuse refused; a current run_id is required. HELD.
- Hash mismatch / failing test / unsafe / post-checker mutation (F03/F05/F09/F12): NOT recovered — HELD.
Every recovered fixture is RE-TESTED (its app selftest must pass) before it can be OK. Unrecoverable fixtures never show PASS/preview.
