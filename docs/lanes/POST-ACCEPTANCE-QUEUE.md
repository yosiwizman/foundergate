# Post-acceptance queue (wide-safe, docs/process — nothing starts without its own gate)

Ordered list of work queued during V8-A acceptance. None of these has started; each begins only under its own
approval. Recorded here so the queue resolves on disk (no phantom work).

| # | Item | Type | Source | Notes |
|---|------|------|--------|-------|
| **WAL** | **THE WRITTEN-AUTHORITY LAW** | process (no product code) | Founder (2026-07-11) | Assembly Manual section: every artifact that authorizes/specifies work must resolve on disk BEFORE that work begins. Two mechanical guards: (i) Evidence-Ledger rows gain an **AUTHORITY** field whose path exists + SHA resolves (CI-red otherwise); (ii) the completion-report law gains an **AUTHORITY column** (unresolved authority = INVALID, like a phantom SHA). Retroactive sweep of existing ledger rows for governing artifacts that never landed on disk — commit verbatim with provenance, or mark `AUTHORITY-UNRECORDED (historical)`. **First bundle AFTER Run 7 results are committed.** PR through protection, exact-SHA CI, AUTHORITY column in its own completion report. |
| **VBDAG** | V8-B contract DAG amendment | docs-only | Sheriff gap (PR #72) | Name the **Attached Projects Registry / persistent-attach** (roadmap V8-B: attach-with-persistent-config) as a named `VBn` substep in the V8-B build-contract DAG. |
| **M1** | Wording: **"stuck" → "On Hold"** | wide-safe UI copy | Run 7 (Mike) | *"it doesn't look stuck if it's working."* The Dashboard waiting/state copy should read "On Hold" rather than "stuck." Cosmetic; view-model copy only. |
| **M2** | Distinct calm colour for **SECRET vs UNKNOWN** badges | wide-safe UI colour | Run 7 (Mike) | SECRET *"needs its own color tag since we have only purple"*; unknown/blocked should be *"a different color that's gonna stick out."* Give SECRET and UNKNOWN/blocked two **distinct calm** treatments (still no red for routine states — the calm-colour law holds; red stays reserved for a genuine problem). |

**Provenance:** M1/M2 are the two non-blocking cosmetic refinement notes from Stranger Test Run 7 (PASSED, 7/7);
WAL + VBDAG were queued earlier in the same session. See `docs/assembly-evidence/VA/stranger-test-run-7.md`.
