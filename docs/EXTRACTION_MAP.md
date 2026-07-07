# Extraction Map — akior-activepieces-engine/harness/ → FounderGate

**Plain English — what this is:** the component-by-component plan for moving the runnable harness out of AKIOR
and into FounderGate. For every component it records the files, whether it's tangled up with AKIOR, its
self-test, how hard it is to extract, and the order we extract in.

**Why it matters:** this map is what keeps the extraction proof-first and honest. We start with the smallest
clean thing, prove the pipeline end-to-end, then widen — instead of grabbing the biggest, riskiest piece first
and getting stuck.

**The single most reassuring finding:** after an exhaustive read of all 468 files, **no component is
HEAVY-COUPLED. Nothing needs an AKIOR path, store, marker, or control-service to run its self-test.** There are
**zero external npm dependencies** anywhere and **no import reaches outside `harness/`**. Every `.akior`
reference is either a *defensive guard* (code that refuses to touch a private store) or *cosmetic sample text* —
never a real dependency. That means **nothing has to be parked**; the whole harness is extractable copy-only.

**What can go wrong:** treating a guard denylist or a sample string as if it were a real coupling (over-parking),
or the reverse — shipping a cosmetic AKIOR string into `src/` (under-cleaning). Guard: each extraction genericizes
guards/strings and must pass its self-test **green in this repo** before it lands.

**What the founder can test now:** `npm test` at the repo root. Today it runs the evidence bus (extracted,
green). Each row below becomes another green self-test as it lands. Track reality in
[`HARVEST_LEDGER.md`](HARVEST_LEDGER.md).

**One next action:** none required from the founder — extraction proceeds down the order below autonomously.

---

## How to read the difficulty column

- **CLEAN** — pure Node, self-contained, reads only its own fixtures/schema. Copy → run.
- **LIGHT-DECOUPLE** — works standalone; only a *guard denylist*, a *cosmetic AKIOR string*, an *optional env
  var*, or an *external binary* (`git`/`gh`, offline self-test) to genericize.
- **HEAVY-COUPLED** — genuinely needs AKIOR to run. **Count in this harness: 0.** (Parked with a gate card if
  ever found — none found.)

## Inventory facts

- Files under `harness/`: **468**. Logic files (`.mjs`, non-self-test): **43**. Self-tests: **37**.
- External npm dependencies: **0**. Imports leaving `harness/`: **0**. Env vars: **1** (optional
  `AKIOR_DEMO_OUT`, tmpdir fallback → rename on extract).
- Two components shell out to a **read-only external binary** (not AKIOR): `prepush-checker` → `git`,
  `github-collector` → `gh`. Both have fully offline, fixture-driven self-tests.

---

## Component inventory

### CLEAN (pure Node, no coupling)

| Component | Key files (under `harness/`) | Self-test | Notes |
|-----------|------------------------------|-----------|-------|
| no-network-runner | `runners/no-network-runner.mjs` (+selftest) | ✓ | 2 files, zero fixtures. Smallest possible green. |
| evidence-bus (core) | `events/evidence-bus.mjs`, `event.schema.json` (+sample builder, selftest) | ✓ | **EXTRACTED — green in this repo** (LIGHT for the sample-data helper only). |
| advisor-verdict validator | `schemas/advisor-verdict/validate.mjs` + schema + examples | ✓ | Canonical `validate.mjs + schema + examples/{valid,invalid}` shape (recurs ~10×). |
| worker-adapter (interface) | `adapters/interface/validate.mjs` + schema + examples | ✓ | |
| adapters/registry | `adapters/registry/validate-registry.mjs` + schemas + `worker-adapters.json` | ✓ | |
| adapters/claude-code | `adapters/claude-code/claude-code-adapter.mjs` + fixture | ✓ | Fixture named `akior-*` (cosmetic only). |
| cage-escape-model | `cage/escape-tests/cage-escape-model.mjs` + 5 fixtures | ✓ | Highest security proof-value; env read is read-only/advisory, never fails. |
| mock-providers (×7 + tripwire) | `mock-providers/index.mjs`, `core.mjs`, `network-tripwire.mjs`, `providers/*` | ✓ | Tripwire monkey-patches node net/tls/http/https/fetch to throw. |
| checker/metrics score | `checker/metrics/score.mjs` + schema + fixtures | ✓ | |
| checker/baseline analyzer | `checker/baseline/…selftest`, schemas, fixtures | ✓ | |
| checker/swarm coordinator | `checker/swarm/swarm-coordinator.mjs` + schemas + fixtures | ✓ | |
| quality score | `quality/score.mjs` + schema + examples | ✓ | Twin of checker/metrics score. |
| gate-card | `gates/gate-card.schema.json` + fixtures + `parked-gates.seed.json` | ✓ | |
| founder-dashboard-state | `dashboard/founder-dashboard-state.*` | ✓ | |
| testable-next tile | `dashboard/testable-next/*` | ✓ | Statically asserts one same-origin fetch in the HTML. |
| planner | `planner/compile.mjs` + fixtures | ✓ | Explicitly no child_process / no I/O. |
| backlog/risk-classifier | `backlog/risk-classifier.mjs` + fixtures | ✓ | |
| backlog/safe-backlog | `backlog/safe-backlog.*` (+ seeds incl. `foundergate-safe-backlog.seed.json`) | ✓ | |
| backlog/maintenance-importer | `backlog/maintenance-to-backlog-importer.*` | ✓ | |
| benchmarks/founder-workload | `benchmarks/founder-workload-benchmark.schema.json` + examples | ✓ | |
| egress validator | `egress/egress-policy.schema.json` + decision-log + fixtures | ✓ | |
| schemas root (×4) | `schemas/{autonomy-plan,cage-policy,project-registry,proof-package}.*` | ✓ | Each independent. |
| schemas/lane-contract | `schemas/lane-contract.schema.json` + examples | ✓ | |
| simulations (×3) | `simulations/{backlog-consume,backlog-refresh-dryrun,lane-refill}*` | ✓ | refresh-dryrun does no I/O. |

### LIGHT-DECOUPLE (guard / cosmetic / external-tool)

| Component | Key files | Self-test | Decouple action |
|-----------|-----------|-----------|-----------------|
| cage-evidence-ledger (+16 fixtures) | `evidence/cage-evidence-ledger.mjs`, sample builder, `fixtures/valid|invalid/*`, `schemas/cage-evidence.schema.json` | ✓ | Genericize the `.akior` write-guard denied-segment list (as done for evidence-bus). |
| held-action sink | `held-actions/hold-action.mjs` + schema + fixtures | ✓ | Genericize `.akior`/`provider-connect` write-guard. |
| onboard-demo | `demo/onboard-demo.mjs` + spec + fixtures | ✓ | Rename optional env `AKIOR_DEMO_OUT`; genericize `FORBIDDEN_SEGMENTS`. |
| audit/cleanup-classifier | `audit/cleanup-classifier.mjs` + schema/fixtures | ✓ | Classifies `.akior` path-strings as protected (domain data); genericize labels. |
| prepush-checker | `checker/prepush-checker.mjs`, `checker-report.schema.json`, `checker-event.schema.json`, `validate.mjs`, fixtures | ✓ | Uses read-only `git` in live mode (external binary, not AKIOR); self-test is offline/fixture-driven. Gate live mode behind `git` presence. |
| github-collector | `collectors/github/github-collector.mjs`, `redact.mjs`, fixtures | ✓ | Uses read-only `gh` (allowlisted api/pr) in live mode; self-test fully offline. |
| proof-package builder (akior) | `proof-packages/akior/build-proof-package.mjs`, `proof-package.model.mjs`, `redact.mjs`, data, selftest | ✓ | Cosmetic AKIOR prose in `model.mjs` (control-service :32148, `.akior` stores) — rewrite to generic sample content. |
| proof-package builder (privatenote) | `proof-packages/privatenote/*` (parallel structure) | ✓ | Cosmetic `.akior` prose (model.mjs) — genericize. |

### HEAVY-COUPLED (parked)

**None.** No component requires an AKIOR path, store, marker, or control-service to run its self-test.

---

## Extraction order (proof-first)

Mission 3 fixes the first three deliberately (evidence bus → a checker → a proof-package builder) to prove the
full pipeline shape early. After that we widen down the CLEAN list (mechanical, low-risk), then finish the
remaining LIGHT-DECOUPLE guards/external-tool/cosmetic components.

1. **evidence bus** — ✅ extracted, green in this repo (the proof-source law as running code).
2. **prepush-checker** — proves the *checker* pipeline (report/event schemas + validator; offline self-test).
3. **proof-package builder (akior)** — proves the *proof-package* pipeline (builder + model + redaction).
4. **cage-evidence-ledger (+16 fixtures)** — the append-only cage evidence ledger.
5. **mock-providers (×7 + network tripwire)** — offline provider set + the network-deny tripwire.
6. **held-action sink** — the held/deferred-action sink with its write-guard.
7. **cage-escape-model** — the security escape-denial model (high proof value).
8. **checker/swarm coordinator + metrics** — swarm queue coordination + reliability scoring.
9. **github-collector** — read-only `gh` bundle collector (offline self-test).
10. **adapters + registry** — worker-adapter interface, registry, claude-code adapter.
11. **founder-workload benchmark** — the founder-workload benchmark validator.
12. **backlog classifier + refresh dryrun** — risk-classifier + no-I/O refresh simulation.
13. **planner** — the plan compiler.
14. **remaining CLEAN** — advisor-verdict validator, quality score, gate-card, dashboards, egress, schema
    validators, lane-contract, simulations, audit/cleanup-classifier.
15. **remaining LIGHT** — onboard-demo, proof-package (privatenote).

**Rule for each row:** one component in flight at a time on the extraction lane. Copy → decouple to generic
config/paths → safety-scan clean → self-test **green in this repo** → PR with the self-test output → log in
[`HARVEST_LEDGER.md`](HARVEST_LEDGER.md). Green-in-this-repo is the only proof that counts.
