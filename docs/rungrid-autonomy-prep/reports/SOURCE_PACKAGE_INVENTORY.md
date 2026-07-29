# PHASE 1 — Source Package Inventory

verified_utc: 2026-07-29T16:38Z

All four packages exist, `unzip -t` OK, SHAs match the values established in their originating runs.

| Pkg | ZIP SHA-256 | Verdict | Checker | Gate Advisor |
|---|---|---|---|---|
| L2 WideBuild | 86333ca180a664d5d7b35e4c21c3530ed787311257135e0d80c2dfafe9f1a403 | WIDEBUILD_LEVEL2_READY_WITH_LIMITS | CLEAN | READY_FOR_TERMINAL0_RECONCILIATION |
| L3 VisualBrowser | 3b1a5de9d91d0a4c0bbc086b892ccd959bd43293c2d9c2d67700e94a3d6dfc2d | LEVEL3_VISUAL_BROWSER_READY_WITH_LIMITS | CLEAN | LEVEL3_VISUAL_BROWSER_READY_WITH_LIMITS |
| L4 RemoteMain Reconcile | 54580828c9f45fbd30581a80123b9d6b314da251453109ac531b6ebd73c90c4c | LEVEL4_RECONCILIATION_READY_WITH_LIMITS | CLEAN | LEVEL4_RECONCILIATION_READY_WITH_LIMITS |
| PR201 MergeGate Prep | 3c66f6826e4b535b03b2737635356759758e57b3a93771bab92e7f8ccec52bc8 | PR201_MERGE_GATE_PREP_READY_WITH_LIMITS | CLEAN | PR201_MERGE_GATE_PREP_READY_WITH_LIMITS |

## Chain of work (what these prove)
1. **L2** — three wide-safe view-model components (dashboard status cards, safety-check evidence drawer,
   live run console + doctor) built additively, 106/106 selftests, integration candidate `a53c2a8`.
2. **L3** — those components rendered/qualified in real headless chromium: 4/4 browser, 0 a11y violations,
   secret redaction proven in the DOM. L3 candidate `84289ec`.
3. **L4** — L2+L3 replayed cleanly onto current `origin/main` (`4f2394a`) as branch candidate `a6a1595`
   (12 files, +703, 0 conflicts).
4. **PR201** — draft review PR from that branch into main; read-only merge-gate prep review: ready-with-limits,
   must remain draft.

## Common carried limits (every package)
- chromium-desktop only (firefox/webkit/mobile UNKNOWN); no pixel-diff baseline; not e2e against live service;
  no merge / not production-ready.

## Common next_safe_action theme
Founder reviews the sealed ZIP; the merge decision for PR #201 is a separate, founder-owned gate. These
repeated "founder reviews / relays a prompt" steps are exactly what the RunGrid controller aims to reduce.

Machine index: `evidence/source_packages/package_index.json`.
