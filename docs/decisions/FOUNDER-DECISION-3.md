# FOUNDER DECISION 3 — FounderGate extracts into its own repo as the product home

- **Date:** 2026-07-06
- **Decider:** Founder
- **Status:** Adopted
- **Scope:** Establishes this repository (`foundergate`) as the product home.

## Plain English — what this decision is

FounderGate — the founder-operated, evidence-first development harness — moves **out of** the AKIOR
codebase (where it was built) and **into this dedicated repository** as its own product. AKIOR becomes
**customer #1**, not the product's home.

## Why it matters

While the harness code lives *inside* AKIOR, two things the product must prove are **structurally impossible**:

1. **Second-project proof** — you cannot show the harness works on a *different* project when it can only be
   run from inside the one project it's entangled with.
2. **Outside-operator proof** — you cannot show a *different operator* (not the AKIOR team) can run it when
   running it requires AKIOR's private stores, paths, and runtime.

Extraction into a standalone repo is the only way to make those two proofs possible. A component that runs
green *here*, decoupled from AKIOR, is the first evidence that FounderGate is a product and not a feature of
one codebase.

## What can go wrong

- **Silent coupling** — a component that appears to work here but secretly still needs AKIOR paths. Guard:
  every component is decoupled to generic config/paths and its self-test must pass **standalone in this repo**.
- **Source drift / accidental mutation** — harvesting could damage the source. Guard: extraction is
  **copy-only**; nothing is ever deleted from AKIOR, and this repo has read-only access to the source.

## What the founder can test now

Nothing to test for this decision itself — it is a direction. The testable proof begins with the first
extracted component (see [`../HARVEST_LEDGER.md`](../HARVEST_LEDGER.md)).

## One next action

Read [`../EXTRACTION_BASELINE.md`](../EXTRACTION_BASELINE.md) to see exactly what exists to extract and how
complete it really is.
