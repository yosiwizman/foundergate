# Extraction Baseline — Terminal Advisor harness inventory

**Plain English — what this is:** a factual snapshot, taken 2026-07-06, of *what exists to extract* into
FounderGate and *how complete it really is*. It exists so the extraction is honest from day one: we record the
real state, not the roadmap's optimistic state.

**Why it matters:** if we start from an inflated picture ("~86–92% done"), every later report inherits that
lie. The disk tells a more sober story (~60–70%), and one whole layer (the v17 judgment layer) is templates,
not runnable code. Naming that now is what keeps FounderGate evidence-first.

**What can go wrong:** treating template-only or heavily-coupled code as "ready." Guard: the
[extraction map](EXTRACTION_MAP.md) classifies each component's difficulty, and nothing is called extracted
until its self-test is green *in this repo*.

---

## The LOCATION-SPLIT finding

The harness is split across **two repositories**, and this split is the single most important fact for
extraction planning:

- **Runnable code** lives in `akior-activepieces-engine/harness/`.
  - **468 tracked files** under `harness/`.
  - **37 self-tests** — the runnable proof surface. These include:
    - evidence bus
    - cage evidence ledger
    - mock providers ×7 + network tripwire
    - prepush / swarm / metrics checkers
    - github collector
    - worker adapters + registry
    - founder-workload benchmark
    - AKIOR + PrivateNote proof-package builders
    - backlog risk-classifier + refresh dryrun
    - planner / compile
    - held-action sink
    - cage escape model
  - This is the **harvest source** for FounderGate's `src/`. Copy-only, read-only.

- **Doctrine** lives in `advisor-on-project-harness`.
  - **1,356 files**, docs-heavy.
  - Relevant PRs: **#10–#14**.
  - This is the source for FounderGate's `docs/doctrine/` (Mission 4). Copy-only, read-only.

## Honest completion

- **Disk-based completion is ~60–70%**, *not* the roadmap's claimed **86–92%**. The gap is real; we plan against
  the disk, not the roadmap.
- **The v17 judgment layer is templates-only, not runnable.** It must not be counted as working code. If/when it
  is extracted, it is extracted as templates and labelled as such — never as a passing component.

## What this means for extraction

- The runnable 37 self-tests are the spine of the extraction: each one that turns green *in FounderGate* is one
  unit of real, transferable product.
- Doctrine import (Mission 4) can proceed in parallel because it is documentation, not runtime.
- Anything that cannot be decoupled from AKIOR without changing AKIOR is **parked HEAVY-COUPLED** with a gate
  card for Terminal-0 coordination — it is never forced through.

## What the founder can test now

Once the first component lands: `npm test` at the repo root runs every green self-test. Today that count starts
at zero and grows one honest component at a time — tracked in [`HARVEST_LEDGER.md`](HARVEST_LEDGER.md).

## One next action

Read [`EXTRACTION_MAP.md`](EXTRACTION_MAP.md) for the component-by-component plan and extraction order.
