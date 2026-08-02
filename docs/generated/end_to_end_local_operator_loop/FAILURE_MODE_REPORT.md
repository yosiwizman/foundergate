# Failure Modes (proven)
server off → UNKNOWN (Run disabled) · session failure → safe UNKNOWN/retry · run failure → ERROR ·
run timeout → HOLD (AbortController) · export before run → disabled/UNKNOWN · export failure →
EXPORT_FAILED (chip not SEALED) · reload after run → UNKNOWN (no fake prior green) · repeated runs →
stable 30/30 · repeated exports → stable SEALED · panel misuse → honest · unsafe repo → HOLD/REFUSED ·
unsafe objective → REFUSED. No fake green, no stale evidence, no fake export.
Verified across the Wave 3 hardening suite (32/32) and the end-to-end loop suite (27/27).
