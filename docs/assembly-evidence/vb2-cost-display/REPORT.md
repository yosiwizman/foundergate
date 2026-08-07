# VB2 — Cost Display (per-run / quota / cost-per-PR)

**Requirement (V8-B completion matrix):** *Cost display* — **PARTIAL**, missing behaviour
"per-run / quota / cost-per-PR display", with only the `cost_budget` schema on disk.

**Status after this lane:** built. A founder-readable surface lays out the declared **quota**,
the **spend per run**, and the **cost per PR** in one place — over a caller-supplied cost
snapshot, with maximum honesty about what has and has not actually been measured.

## What was added

- **`src/v8b2/cost-display.mjs`** — a pure, read-only surface. It takes a caller-supplied cost
  snapshot and:
  - shows the declared **quota** (monthly limit, `enforcement` label, whether paid services are
    blocked, and the same-failure-loop policy) — read straight from FounderGate's existing
    `.foundergate/cost_budget.json` shape;
  - shows the **spend per run** and the **cost per PR** within each run;
  - derives a **total** and a **budget status** with the honesty rules below;
  - carries the snapshot's **`source` truth-label** (`live` vs `fixture`) to the page.
  - No `fs` / net / `child_process` / clock / randomness. Same snapshot in → byte-identical page
    out.

- **`src/v8b2/cost-display.selftest.mjs`** — 20 checks: quota pass-through, deterministic
  two-decimal money formatting, the unmeasured-is-never-$0 law, measured-only summation, the
  partial-total floor, the "within budget" gate, over-limit surfacing, no-limit / unmeasured
  handling, per-PR roll-up, purity, injection-safe escaping, a complete page, deterministic
  output, and the three act-edge scans (source imports, rendered page, exported names).

- **`docs/assembly-evidence/vb2-cost-display/`** — this REPORT, the deterministic generator
  (`render-evidence.mjs`), and the rendered page (`cost-display.html`).

## The honesty stance — never invent money (Law 54)

FounderGate's cost budget is declared `enforcement: "policy-display-only"`: the limit is
**displayed, not enforced**, and the harness does not yet **meter** spend. So the surface refuses
to fabricate money:

- **An unmeasured run / PR cost is "not measured" — never guessed to `$0.00`.** A silent zero is
  the most seductive cost lie there is; a measured real `$0.00` is shown as `$0.00` and is kept
  distinct from an unmeasured cost.
- **The total sums only measured costs.** When any run is unmeasured the total is flagged
  **PARTIAL** (a floor — the true spend is at least this much), never presented as complete.
- **"Within budget" is asserted only** when *every* run is measured *and* the complete total sits
  under a declared limit. A partial total can only ever say "at least X% of the limit so far".
- **No monthly limit is invented:** a snapshot with no declared limit says "no limit declared",
  assuming neither unlimited nor zero.
- **The `enforcement` label is carried verbatim** to the top of the page, so a founder always
  knows the budget is displayed, not policed.

## Evidence (rendered from real data, offline)

`render-evidence.mjs` reads two **committed** fixtures and writes `cost-display.html`:

- the declared **quota** — `src/v8a1/fixture/mock-project/.foundergate/cost_budget.json` (the same
  policy the V8-A1 dashboard displays: a `$50` monthly limit, paid services blocked,
  `policy-display-only`); and
- the **cost-per-PR** rows — the committed GitHub collector fixture
  (`src/collectors/github/fixtures/sample-bundle.json`) run through the **frozen** `normalizeBundle`
  normalizer, one row per open PR (#139, #140, #141).

Reproduce:

```
node docs/assembly-evidence/vb2-cost-display/render-evidence.mjs
```

Because spend is **not metered yet**, the generator feeds the run and its PRs in with **no
recorded cost**, and the page shows each honestly as **"not measured"** — never `$0.00` — while
still laying out the full quota + per-run + cost-per-PR structure the founder will read once
metering is switched on. That is the real, on-disk truth today, said out loud. The self-test
proves the surface renders exact per-run / per-PR figures, partial-total floors, and within/over
verdicts correctly **when** costs are present, so the display capability is proven even though
production data is currently all-unmeasured.

## Read-only / no act edge (verified)

- Full self-test suite green (106/106 on this lane).
- The rendered page contains **zero** of: `<script>`, `<form>`, `<button>`, `<input>`, inline
  `on*=` handlers, `href=`, or any `<a>` anchor.
- The surface module imports no side-effecting Node built-in and touches no disk/network. There
  is nothing here to raise or lower a budget, cancel a run, or spend a dollar — the cost guard
  (runtime enforcement) is a later, separately-gated engine and is **not** wired here.

Local commit only; Terminal-0 owns merges.
