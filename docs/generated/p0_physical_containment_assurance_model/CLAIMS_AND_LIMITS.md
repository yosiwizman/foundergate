# Claims and Limits — P0.3 Physical Containment Assurance Model

## Allowed (evidence-bound) claims
- Physical containment assurance MODEL implemented locally with limits (levels, contract, supervisor, capability gate, path inventory, relay/power/evidence-channel, measured boot, assumption register, evidence package, claim blocker, adversarial matrix).
- Three assurance levels are separated and never treated as equal; inflation is refused.
- Synthetic hardware-state evidence records are produced; missing/unknown physical evidence fails closed (UNKNOWN / NOT_PASSED).
- 32-case adversarial matrix fails closed; forbidden claims are blocked.

## NOT allowed (explicitly not claimed)
- NOT claimed: real physical containment.
- NOT claimed: escape impossible.
- NOT claimed: unhackable.
- NOT claimed: absolute security.
- NOT claimed: real sandbox security or production isolation.
- NOT claimed: security or compliance certification.
- NOT claimed: commercial or SaaS readiness.
- NOT claimed: customer proof or paid proof.
- NOT claimed: measured boot proves vulnerability-free firmware.
- NOT claimed: a VM equals a physically severed machine.

## Standing limits
- LOCAL / SYNTHETIC MODEL only; deterministic records; no real hardware, no external network. Never SHIP.
- The capability-gate signature is a synthetic placeholder (no real key). The hardware supervisor is a state model, not real hardware.
- Real relay/power/radio/USB/data-diode/network control and any real physical containment require a hardware + founder gate; all blocked here.
