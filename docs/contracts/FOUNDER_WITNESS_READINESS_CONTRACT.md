# Founder Witness Readiness Contract (TBF-1)

`READY_FOR_HUMAN_PERCEPTION_WITNESS` is a **derived** state, produced only by
`tools/policy/validate_witness_readiness.py`. No builder, UI, or manifest field may set it; a manifest
that self-declares readiness is rejected. Allowed witness states: `NOT_READY`,
`MACHINE_VERIFICATION_IN_PROGRESS`, `MACHINE_VERIFICATION_BLOCKED`,
`READY_FOR_HUMAN_PERCEPTION_WITNESS`, `WITNESS_COMPLETED`, `REJECTED`.

The founder is presented only when machine verification is exhausted and the founder is needed for
human perception, usability, signatures, legal/commercial authority, or live-action authorization —
never as a substitute for a machine-testable check.
