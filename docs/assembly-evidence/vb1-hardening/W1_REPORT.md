# W1 Report — VB1-Hardening Amendment (DRAFT)

**STATUS: DRAFT — PENDING INDEPENDENT CHECK.** Author lane W1 makes **NO** readiness or approval claim.
This report accompanies the DRAFT authority `docs/lanes/vb1-hardening-amendment.md`. It authorizes nothing.

## Claims table (AUTHORITY column — resolvable full-40-char SHAs)

| # | Claim (proposed as VB3 ENTRY CRITERION) | Source residual/property | AUTHORITY (`path @ full-40-char-SHA`) |
|---|------------------------------------------|--------------------------|----------------------------------------|
| EC-1 | Rollback commit loop re-canonicalizes + re-checks containment before each write and opens via O_NOFOLLOW-equiv / fd, closing the NEW-2 symlink-TOCTOU without relying on an advisory lock | NEW-2 (commit phase uses raw manifest path) | `docs/assembly-evidence/VB1/checker-report-round2.md @ 2ad8d3daf61e87e8c6584a34b19c7613a7b26434` |
| EC-2 | Approvals (HMAC-signed + field-bound in VB1) hardened with append-only, tamper-evident provenance | VB1 approval verification baseline (HIGH-1) | `docs/assembly-evidence/VB1/checker-report-round2.md @ 2ad8d3daf61e87e8c6584a34b19c7613a7b26434` |
| EC-3 | Central write-intent guard (AKIOR #4 / LOW-2) mechanically enforced, not conventional | LOW-2 (single-sanctioned-writer deferred residual) | `docs/assembly-evidence/VB1/checker-report-round2.md @ 2ad8d3daf61e87e8c6584a34b19c7613a7b26434` |
| EC-4 | VB3 binds verifier as a module-private capability set only by VB3 wiring — not a defaultable `act()` argument | NEW-1 (caller-substitutable verifier capability) | `docs/assembly-evidence/VB1/checker-report-round2.md @ 2ad8d3daf61e87e8c6584a34b19c7613a7b26434` |
| EC-5 | Before VB3 wiring is accepted, a check proves `VB3_VERIFIER` is still inert (no approval executes) at the frozen SHA | VB1 inert-verifier safety invariant (`VB3_VERIFIER = null`) | `docs/assembly-evidence/VB1/checker-report-round2.md @ 2ad8d3daf61e87e8c6584a34b19c7613a7b26434` |
| — | Residuals LOW-2 / NEW-1 / NEW-2 recorded as tracked VB1→VB3 items (this DRAFT elevates them to entry criteria) | V8-B build contract residual ledger | `docs/lanes/V8-B-build-contract.md @ 670046b74b805790de785daa3f14cb0c7f5bad12` |

All AUTHORITY SHAs are full 40-character blob SHAs resolvable at the frozen base commit
`ecba6a7ed28381180f52ed7c0b903abe5edd8088` via `git rev-parse HEAD:<path>` and readable via `git cat-file -p <sha>`.

## Scope confirmation

- Files added by this lane: `docs/lanes/vb1-hardening-amendment.md`, `docs/assembly-evidence/vb1-hardening/W1_REPORT.md` (this file) only.
- NOT touched: `docs/lanes/shared-host-workload-lease.md`, any `src/**` file, any other lane's file, the shared EVIDENCE_LEDGER / FOUNDER_GATE_LEDGER.
- No visibility/license/collaborator change; repo remains PRIVATE.
- No acceptance card issued; **no soak-pass line emitted**; VB1 acceptance remains HELD per §29.

*Author lane W1. DRAFT — PENDING INDEPENDENT CHECK.*
