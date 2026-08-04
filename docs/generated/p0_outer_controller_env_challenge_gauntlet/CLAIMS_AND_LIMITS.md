# Claims and Limits — P0.2 Outer Controller + Environment Challenge Gauntlet

## Allowed (evidence-bound) claims
- Local always-on outer controller implemented with limits.
- Environment Run Contract implemented locally (validated; digest changes on material change).
- Pre-run attestation implemented locally (fails closed on missing critical evidence).
- Boundary challenge gauntlet implemented locally (15 challenges; behavior recorded, not config-only).
- Independent evidence plane implemented locally (append-only, outside worker control).
- Containment / stop decisions implemented locally (evidence sealed before stop; real harmless-child teardown proven).
- Post-run verification implemented locally (never emits "secure").
- Synthetic boundary failures detected/held/stopped; no false green in the local challenge gauntlet.

## NOT allowed (explicitly not claimed)
- NOT claimed: real sandbox security proven.
- NOT claimed: real network isolation proven.
- NOT claimed: production environment integrity proven.
- NOT claimed: real provider support complete.
- NOT claimed: private repo support complete.
- NOT claimed: customer-ready assurance.
- NOT claimed: SaaS-ready assurance.
- NOT claimed: security or compliance certification.
- NOT claimed: commercial certification.
- NOT claimed: Gate 8 completed.
- NOT claimed: paid proof.

## Standing limits
- LOCAL / SYNTHETIC only; deterministic records; no external network call. Never SHIP.
- Challenges are controlled synthetic records (and one real harmless local child for teardown); they do NOT probe the real internet.
- Real provider / private repo / Gate 8 blocked; each needs an explicit founder authorization phrase.
