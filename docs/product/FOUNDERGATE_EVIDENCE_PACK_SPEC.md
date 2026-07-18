# FounderGate Evidence Pack — Spec (Phase 7.1, Lane B)

An evidence packet tied to **one exact run**. Canonical representation is JSON; Markdown/HTML/PDF render from it; the ZIP bundles all formats + the safe evidence subset. Generator: `src/safety_check/evidence-pack.mjs` (deterministic).

## Contents (30 fields)
1 packet title · 2 packet version · 3 run ID · 4 repository URL · 5 owner/name · 6 exact commit · 7 archive SHA-256 · 8 canonical snapshot SHA-256 · 9 acquisition timestamp · 10 run start/end · 11 environment identity · 12 check modules · 13 compileability observation · 14 build result = **NOT PROVEN** · 15 test result = **NOT PROVEN** · 16 security result = **NOT PROVEN** · 17 production-readiness = **NOT PROVEN** · 18 network-isolation observation · 19 Docker-socket observation · 20 host-mount observation · 21 teardown evidence · 22 snapshot-deletion evidence · 23 VM-destruction evidence · 24 limitations · 25 UNKNOWN items · 26 artifact index · 27 artifact SHA-256 manifest · 28 checker identity + verdict · 29 claim-boundary statement · 30 "This is an evidence packet, not a certification."

## Formats
`evidence-pack.json` (canonical) · `.md` · `.html` · `.pdf` (Chrome headless from HTML) · `.sha256` · `.zip`. Reproducible from the canonical JSON.

## Redaction (never included)
tokens · env secrets · private keys · cookies · raw credentials · unnecessary raw logs · macOS user-private paths · customer data · private-repository content.

## Claim labels
Every claim is one of: PROVEN · OBSERVED · NOT_PROVEN · UNKNOWN · HELD · REFUSED. The generator **refuses** to emit a green certification statement and refuses to render a packet missing the exact commit or snapshot digest. Footer: "FounderGate Evidence Pack — evidence of the named checks on the exact recorded version; not a security, compliance, production-readiness, or bug-free certification."
