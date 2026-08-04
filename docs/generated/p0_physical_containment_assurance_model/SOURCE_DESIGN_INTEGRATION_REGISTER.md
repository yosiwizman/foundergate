# Source Design Integration Register — Physical Containment Assurance Design
> Design status: **DESIGN PROPOSAL — NOT IMPLEMENTED, NOT VERIFIED, NOT EXECUTION AUTHORITY.** Integrated here as a LOCAL / SYNTHETIC model only.

| Design section | Classification | Where it lands |
| --- | --- | --- |
| Executive summary | INFORMATIVE_EXPLANATION | ROADMAP_UPDATE_P0_3.md |
| Claim boundaries | IMPLEMENTED_LOCAL_SYNTHETIC | physical-claim-blocker.mjs (allowed vocab + forbidden phrases) |
| Assurance levels (1/2/3) | IMPLEMENTED_LOCAL_SYNTHETIC | assurance-levels.mjs (never equivalent; inflation refused) |
| Hardware supervisor | IMPLEMENTED_LOCAL_SYNTHETIC (state model) / BLOCKED_BY_HARDWARE_GATE (real) | hardware-supervisor-model.mjs |
| Cryptographic capability gate | IMPLEMENTED_LOCAL_SYNTHETIC (synthetic signature) | capability-gate.mjs |
| Physical network control | IMPLEMENTED_LOCAL_SYNTHETIC (records) / BLOCKED_BY_HARDWARE_GATE (real) | path-inventory.mjs, relay-power-evidence-channel.mjs |
| Power kill | IMPLEMENTED_LOCAL_SYNTHETIC (records) / BLOCKED_BY_HARDWARE_GATE (real) | relay-power-evidence-channel.mjs |
| One-way evidence channel | IMPLEMENTED_LOCAL_SYNTHETIC | relay-power-evidence-channel.mjs |
| Measured boot | IMPLEMENTED_LOCAL_SYNTHETIC (identity/integrity only) | measured-boot-identity.mjs |
| Assumption register | IMPLEMENTED_LOCAL_SYNTHETIC | physical-assumption-register.mjs |
| Run lifecycle | PLANNED_REQUIREMENT (wire into outer controller) | ROADMAP_UPDATE_P0_3.md |
| Status vocabulary | IMPLEMENTED_LOCAL_SYNTHETIC | physical-claim-blocker.mjs |
| Evidence package | IMPLEMENTED_LOCAL_SYNTHETIC (20 sections) | physical-evidence-package.mjs |
| Adversarial matrix | IMPLEMENTED_LOCAL_SYNTHETIC (32 cases fail-closed) | adversarial-matrix.mjs |
| Acceptance criteria | PLANNED_REQUIREMENT | OPEN_DESIGN_DECISIONS_REGISTER.md |
| Product positioning | INFORMATIVE_EXPLANATION | ROADMAP_UPDATE_P0_3.md |
| Open design decisions | FOUNDER_CLARIFICATION_REQUIRED | OPEN_DESIGN_DECISIONS_REGISTER.md |
| Real hardware execution authority | BLOCKED_BY_HARDWARE_GATE | not implemented; requires a real founder + hardware gate |
