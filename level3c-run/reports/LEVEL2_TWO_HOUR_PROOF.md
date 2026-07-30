# Level-2 Two-Hour Unattended Proof (Part B)

**Verdict: `LEVEL2_TWO_HOUR_PROVEN`** — decided by the classifier from monitor+ledger disk spans, not from the wall-clock timer.

## Duration (from disk)
| Stream | First sample | Last sample | Span | Samples | Max gap |
|--------|--------------|-------------|------|---------|---------|
| monitor | 2026-07-30T14:05:06Z | 2026-07-30T16:05:19Z | **120.2 min** | 121 | 1 min |
| ledger | 2026-07-30T14:05:06Z | 2026-07-30T16:05:12Z | **120.1 min** | 121 | 1 min |

Both streams span ≥120 min with continuous 60 s samples (no gap > 1 min). `duration_summary.json` → `pass: true`.

## Unattended-autonomy evidence
- **Fixed, move-immune evidence root:** `~/.foundergate/runs/<run_id>/level2-proof/` (never the Desktop folder).
- **Mac kept awake:** `caffeinate -dimsu` on for the entire run (every monitor sample shows `caffeinate=on`).
- **Sub-loops all fired:** timer 242 ticks; health checks 13 (every 10 min: `node=ok caffeinate=on evidence_root_writable=yes`); git/lock checks 13 (every 10 min); recovery-readability checks 5 (every 30 min: `recovery_readable=yes`).
- **No founder prompt** during the run; **no external sends**; **provider_used=0** every ledger line; **lock=none** (no product-operation lock contended).
- **No evidence-write failure:** no root `status.json` HELD marker was ever written (fail-closed path never triggered).
- **Timer ≠ pass:** at 120 min the driver wrote `TIMER_MINIMUM_REACHED` explicitly annotated "PASS pending disk-span classification"; the PASS came only after the classifier verified both spans from disk.
- **Clean stop:** monitor/ledger/driver/caffeinate all terminated; 0 loops left alive.

## Why this is a real fix over L3B
This run used the corrected harness. Even though the workspace Desktop folder was relocated earlier in this operation (the exact L3B trigger), the authoritative evidence lived in `~/.foundergate/runs/…` and was untouched — so a full, continuous 120-minute span exists on disk. L3B produced only ~62 min before its evidence died on a folder move; this run produced a continuous 120.2 min.

## Scope honesty
This proves the **Level-2 two-hour unattended duration + autonomy** with move-resilient, fail-closed evidence. It does **not** prove Level 3 (5 h) or Level 4 (8 h), and makes no production/commercial/customer-ready claim.
