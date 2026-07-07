# FounderGate

**Plain English first — what this is:** FounderGate is a *founder-operated AI development harness*. It lets a
non-developer founder run senior-quality software development through **gated, evidence-first autonomous runs** —
long stretches of autonomous engineering that pause only at real decision points a human must own ("founder gates"),
and that produce **proof** (runnable self-tests, evidence timelines, gate cards) rather than claims.

**Why it matters:** Most "AI builds your app" tools ask you to trust output you cannot check. FounderGate inverts
that: every component ships with a self-test that runs green *in this repository, standalone*, and every report leads
with plain English — what it is, why it matters, what can go wrong, what you can test right now, and exactly one next
action. If it isn't proven here, it doesn't count here.

**What can go wrong (and how FounderGate guards against it):**
- *False "done" claims* → every extracted component carries a self-test that must pass in this repo before it lands.
- *Hidden coupling to a private system* → components are decoupled to generic config/paths before they land.
- *Leaked secrets* → a secret scan runs over staged changes before every commit; `.env`, keys, tokens, and private
  store paths are excluded by `.gitignore` and blocked at commit time.

**What you (the founder) can test right now:** run `npm test` at the repo root — it runs every extracted component's
self-test and prints pass/fail. Green means the pipeline is real.

**One next action:** read [`docs/EXTRACTION_BASELINE.md`](docs/EXTRACTION_BASELINE.md) for where the code came from
and how complete it is.

---

## Product shape

| Path | What lives here |
|------|-----------------|
| `src/` | Shipped, decoupled product code — each component with its runnable self-test |
| `docs/` | Foundation records, extraction map, harvest ledger, founder-readable reports |
| `docs/doctrine/` | Operating contracts and gate doctrine adapted to product form |
| `.github/workflows/` | CI that runs every self-test on every push/PR |

## Provenance

FounderGate is extracted from a working harness that currently lives inside its first customer's codebase (AKIOR).
The extraction is **copy-only**: nothing is deleted from the source. See
[`docs/EXTRACTION_BASELINE.md`](docs/EXTRACTION_BASELINE.md) and [`docs/HARVEST_LEDGER.md`](docs/HARVEST_LEDGER.md).

## Running self-tests

```bash
npm test            # run every extracted component's self-test
node --test         # (equivalent, once components register)
```

Each component is also runnable directly, e.g.:

```bash
node src/events/evidence-bus.selftest.mjs
```

## Status

This repository is **private** and under active extraction. It is not published, released, or licensed for
distribution. See the harvest ledger for what is green standalone today.
