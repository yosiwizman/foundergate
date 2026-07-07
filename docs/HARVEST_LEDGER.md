# Harvest Ledger

**Plain English — what this is:** the running, append-only record of every component copied from the source
harness into FounderGate — where it came from, what changed to decouple it, whether the secret scan was clean,
and whether its self-test ran **green in this repo**. If it isn't in this ledger with a green self-test, it is
not extracted.

**Why it matters:** this is the founder's single source of truth for "what is actually real here." It is the
honest counterweight to any roadmap percentage.

**What can go wrong:** a component logged as done without a green-in-this-repo self-test. Guard: every row must
cite the self-test result observed *here*, not in AKIOR.

---

## Legend

- **Difficulty:** CLEAN (no AKIOR coupling) · LIGHT-DECOUPLE (generic renames/paths) · HEAVY-COUPLED (parked).
- **Scan:** result of the safety-patch secret/coupling scan over the staged changes.
- **Self-test:** result observed by running the component's self-test **standalone in this repo**.

## Components

| # | Component | Source path | New path | Difficulty | Decoupling changes | Scan | Self-test (this repo) | Date |
|---|-----------|-------------|----------|-----------|--------------------|------|-----------------------|------|
| 2 | prepush checker | `akior-activepieces-engine/harness/checker/` (`prepush-checker.mjs`, `validate.mjs`, `checker-report.schema.json`, `checker-event.schema.json`, `prepush-checker.selftest.mjs`, `fixtures/{reports,events,snapshots}/**`) | `src/checker/` | LIGHT-DECOUPLE | Cosmetic-only: (1) schema `$id`s `akior.local`→`foundergate.local`; (2) schema `title`/`description` "AKIOR H31 …"→"FounderGate …"; (3) default `checker_id` and all fixture `checker_id`s `akior-independent-prepush-checker`→`foundergate-independent-prepush-checker` (free string, still valid); (4) header comments genericized. No behavior change; the checker's read-only `git` probe (live mode only) is an external-tool call, not an AKIOR coupling, and the self-test is fully offline/fixture-driven. | CLEAN | **PASS — all checks (`PREPUSH-CHECKER-SELFTEST: PASS`)** via `node src/checker/prepush-checker.selftest.mjs`; also green via `npm test` (2/2) | 2026-07-06 |
| 1 | evidence bus | `akior-activepieces-engine/harness/events/` (`evidence-bus.mjs`, `event.schema.json`, `build-sample-timeline.mjs`, `evidence-bus.selftest.mjs`) | `src/events/` | LIGHT-DECOUPLE | (1) Schema `$id`/`title` genericized `akior.local`→`foundergate.local`, "AKIOR Evidence Bus Event"→"FounderGate Evidence Bus Event". (2) Path guard rewritten from a hardcoded `.akior`/AKIOR-store-name denylist into a **generic, configurable** protected-store guard (`DEFAULT_PROTECTED_SEGMENTS`/`DEFAULT_PROTECTED_NAME_PATTERNS`, overridable via opts) — no AKIOR reference, same safety behavior, still tested. (3) Sample timeline rewritten from AKIOR night-run narrative to a generic `your-org/your-project` example run (still covers all 14 event types + all 8 source types + honest grades). | CLEAN | **PASS — 17/17 checks** (`node src/events/evidence-bus.selftest.mjs`; also green via `npm test`) | 2026-07-06 |

## Scan log

| Date | Commit / branch | Scan result | Notes |
|------|-----------------|-------------|-------|
| 2026-07-06 | `main` bootstrap | CLEAN | Matches were `.gitignore` exclusion rules + README policy text; no secrets/couplings. |
| 2026-07-06 | `mission1-foundation-records` | CLEAN | Docs-only (foundation records). Scan matches were prose ("risk-classifier", "risk. The"); no secrets/couplings. |
