# Advisor Tracker — v8 snapshot (2026-07-17)

> **Governance-on-disk (P2).** A truthful twin of where each piece stands **on disk right now**, reconstructed
> from the ledgers + `docs/status/` — not from memory. **Proof-label discipline:** MERGED ≠ ACCEPTED; a DRAFT
> authorizes nothing; a scaffold is not executing; a soak is not passed without the full AND-gate. A signed
> ledger beats this tracker. **As of:** 2026-07-17 · **Base:** main `61b6feb` (this wave lands on top) · Repo private.
> Supersedes `docs/status/ROADMAP-v7-status.md` for current-state reading; makes no readiness/pilot/production claim.

## Stage headline
- **V8-A whole-product: ACCEPTED** (founder gate `V8-A ACCEPTANCE`, Stranger-Test Run 7, product-final `85a59f9`).
- **V8-B build era, VB1: ACCEPTED 2026-07-17** — founder gate `G4-B-VB1`, run launcher/executor at audited tree `src/v8b1` = `cba621e28…`, accepted at main `9b1ad23…`. Act edge machine-gated (`VB3_VERIFIER=null`) until VB3.
- **§29 endurance evidence: COMPLETE** — 8–9h leg (`VB1-SOAK-RUN2-PASS`) + 24h leg (`VB1-SOAK-24H-PASS`), both PASS, independently re-derived + ledgered.
- **VB2: scaffold merged (NON-executing) + build-spec DRAFT** (this wave; `docs/lanes/vb2-build-spec.md`). VB2 BUILD is a FROZEN founder gate.
- **VB3 / dispatcher (KCA) / act edge / harvest adoptions: FROZEN.**

## Foundations on disk (accepted / merged)
| Item | State | Anchor |
|---|---|---|
| V8-A1..A4 (Dashboard/Preview/File Cabinet/Guide) | ACCEPTED | founder gates G4-A1..A4; product-final `85a59f9` |
| §29 Honest-Duration & Soak-Proof Law | adopted | `HONEST-DURATION` #82 |
| L1–L4 evidence-integrity infra | merged (gate the soak) | `L1-L4-EVIDENCE-INTEGRITY` #110–#113 |
| SHWL authority | founder-SIGNED (build held→) | `G-SHWL-AUTHORITY`, signed `9ef4fa0` |
| SHWL build | ACCEPTED (steps I/J held) | `G-SHWL-BUILD`, `628bb11` |
| VB1 run launcher SAFETY CORE | ACCEPTED | `G4-B-VB1` (2026-07-17) |
| Reviewed soak driver + SD-1 sentinel fix | merged | `soak-driver.mjs`; SD-1 CLOSED PR #127 |
| W1-H1 accumulator sub-result label | merged (this wave) | Lane 4, `reliability-soak.mjs` |
| P1 Backup/DR (tested) | DONE (this wave) | `docs/assembly-evidence/backup-dr/BACKUP_DR_RECORD.md` |

## Released by the 2026-07-17 wave
- **P1 Backup/DR** → DONE (encrypted tested backups of both repos + raw soak reports; off-site + key-custody queued as founder actions).
- **W1-H1** → DONE (accumulator emits a labeled availability+duration sub-result; independent checker CLEAN + mutation proof; merged).
- **D3 Component Classification Doctrine** → DRAFT merged (independent check; **founder signature queued**, not signed).
- **VB2 build-spec** → DRAFT merged (W2 three items resolved + integrated-soak criterion; **VB2 build-release founder sentence queued**).

## Registered backlog (NONE ACTIVE · founder release required) — see `docs/status/ADVISOR_REGISTRY.md`
- **Doctrine D1–D5:** D1 Checker Shortcut Catalog (12 shortcuts incl. #12 transport≠operational); D2 Mechanical Floor (partly emergent — Pro firewall hooks); **D3 (this wave, DRAFT, signature queued)**; D4 Mismatch Log (MISMATCH-EVENTS.md live); D5 Context Hygiene line-count law.
- **Harvest queue H1–H4** (await AKIOR seals): H1 RC-Doc-Integrity Gate (SOURCE-NOT-READY); H2 Founder-Gate Capsule; H3 Founder-Driven Witness Contract; H4 No-Split-Brain UI Contract.
- **Future product FS1** — Customer Soak-as-a-Feature (post-VB3; ephemeral per-run cloud VMs).
- **Positioning notes PN1–PN6** — two-layer PROVEN/PLANNED rule is LAW (PN3 corrected to cite provable artifacts only).
- **Founder backlog:** ~~P1 (DONE)~~; P2 Governance-on-disk (this tracker + `docs/advisor/` = first installment); P3 Dependency/CVE lane; P4 Secrets lifecycle (blocked behind KCA).

## Standing decisions / open honesty items
- **KCA precondition: UNSATISFIABLE** in single-operational-principal reality; founder-DEFERRED; dispatcher build blocked by HR-4.
- **W2 build-time items** (ID entropy · pin hash · status mapping) — resolved as spec text in the VB2 build-spec DRAFT (this wave); binding only on VB2 build release.
- **SD-1: CLOSED** (PR #127).
- **VB1 pre-signature-audit:** historical W4 absence **permanently recorded as a mismatch** (never backfilled); current artifact honestly created 2026-07-17 (`advisor-pre-signature-audit.md`), pre-signature per §12.
- **Bind-SHA mismatch (2026-07-17):** advisor quoted a nonexistent `41c2f80`; terminal halted fail-closed; re-bound to `b904366` (MISMATCH-EVENTS.md).

## Frozen (regardless of width)
VB2 BUILD, VB3, dispatcher (KCA), harvest adoptions (await AKIOR seals), the act edge. Nothing in this tracker moves them.
