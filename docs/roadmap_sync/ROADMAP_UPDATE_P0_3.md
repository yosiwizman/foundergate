# Roadmap Update — P0.3 Physical Containment Assurance Model

## Maturity label
LOCAL_SYNTHETIC_PHYSICAL_CONTAINMENT_MODEL_READY_WITH_LIMITS

## How it extends P0.2
P0.2 gave an always-on outer controller + environment challenge gauntlet (software boundary assurance). P0.3 adds a
model that separates THREE assurance levels — software isolation (L1), hardware-assisted containment (L2), and
physically severed execution (L3) — and refuses to treat them as equal or to inflate one into another.

## Why it is core IP
- The defensible primitive is honest level separation plus a claim blocker that structurally forbids every absolute
  phrase (escape impossible, unhackable, absolutely secure — all forbidden/blocked), plus a narrow single-use
  hardware-gated capability object the execution environment can request but never self-authorize.

## Implemented now (local synthetic)
- Assurance level model; physical run contract; hardware supervisor state model; cryptographic capability gate
  (synthetic signature); physical path inventory + alternate-route verifier; relay/power/one-way-evidence-channel
  models; measured-boot/device-identity records; physical assumption register; physical evidence package (20 sections);
  physical claim blocker; 32-case adversarial matrix (all fail-closed); UI panel; headed browser proof.

## Only planned
- Wiring the physical run lifecycle into the always-on outer controller; acceptance criteria; persistent evidence-plane hardening.

## Requires hardware / founder gate
- Any real relay/power/radio/USB/data-diode/network control; any real physical containment claim; a real hardware prototype. All BLOCKED here.

## Forbidden claims (permanent)
- Forbidden/blocked (never asserted): escape impossible; unhackable; absolutely secure; real physical containment; full isolation proven; all covert channels absent; measured boot proves no vulnerabilities; a VM equals a physically severed machine.
