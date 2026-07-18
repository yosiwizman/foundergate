# VB3 Gate/Witness Engine — Build Contract (specification)

Binds edge-cases EC-1..EC-5 + H3/H4:
- **EC-1 rollback hardening:** no-follow file behavior; re-canonicalization before mutation; lock across validate/mutate/undo; path-substitution tests.
- **EC-2 immutable approval provenance:** approval ID, exact SHA/project/action/scope, data class, authority, timestamp, expiry, anti-replay, evidence digest.
- **EC-3 mechanical single writer:** one sanctioned mutation route; alternate-route denial; one writer lock; stale-writer recovery; duplicate-writer tests.
- **EC-4 module-private verifier:** no caller-supplied/defaultable/null/mock verifier in production path.
- **EC-5 proven inert before acceptance:** act edge disabled; no real token/mutation/live provider/customer data; synthetic fixtures only.
- **H3 founder-driven witness:** actual founder input; no generated substitute.
- **H4 single canonical state:** one approval + one witness source; stale UI fails closed; split-brain refused.

Act edge remains **FROZEN**. Specification checker required before any inert-core build.
