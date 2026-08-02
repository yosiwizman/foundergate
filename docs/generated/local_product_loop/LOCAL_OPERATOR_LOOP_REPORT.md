# Local Operator Loop
End-to-end, local-only, no-terminal loop in the deck-style environment: Source intake (default Safe
local demo) → Objective intake (default pre-filled) → Safety classification (SAFE/HOLD/REFUSED/
UNKNOWN) → Run eligibility gate → Governed local run (real /api/start, allowlisted target) →
Founder-readable result across panels (decision never SHIP) → Sealed evidence export (real
/api/export, unzip-verified) with a founder-facing receipt (source, objective, classification,
tests, decision, limitations, what was NOT proven). Unsafe source/objective is held/refused and
never run. Verified: end2end-loop 27/27, local-product-loop 18/18.
