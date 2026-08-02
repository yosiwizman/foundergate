# Failure Modes (proven)
server off → UNKNOWN (Run disabled) · session failure → safe UNKNOWN/retry · run failure → ERROR ·
run timeout → HOLD · export before run → disabled · export failure → EXPORT_FAILED (chip not SEALED)
· reload → UNKNOWN (no fake green) · repeated runs/exports → stable · stale evidence → reset to
UNKNOWN each run · unsafe source → HOLD/REFUSED · unsafe objective → REFUSED · panel misuse →
honest. No fake green / stale evidence / fake export. Verified: wave3 32/32 + end2end 27/27 +
local-product-loop 18/18.
