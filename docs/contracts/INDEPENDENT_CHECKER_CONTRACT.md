# Independent Checker Contract (TBF-1)

For impacts requiring an independent checker (UI, RUNTIME, SECURITY, GATE), a checker that did **not**
build the work reviews the exact candidate SHA read-only and attempts to falsify the claims. A
builder's own statement is not independent verification. Allowed verdicts: `CLEAN`, `FINDINGS`,
`REJECT`, `INSUFFICIENT-EVIDENCE`. Only a CLEAN independent verdict (recorded in the evidence manifest
`checker` field) contributes to witness readiness. Up to three bounded correction cycles are permitted
for the same material failure; a fresh checker context is used after each correction.
