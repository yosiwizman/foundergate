// FounderGate V8-B VB2 — Cost Display surface EVIDENCE GENERATOR.
//
// Plain English: this renders the dedicated Cost Display surface from REAL committed data,
// entirely offline:
//   - the declared QUOTA is the committed cost budget policy the V8-A1 dashboard already reads
//     (src/v8a1/fixture/mock-project/.foundergate/cost_budget.json); and
//   - the PER-RUN / cost-per-PR rows are built from the committed GitHub collector fixture
//     (src/collectors/github/fixtures/sample-bundle.json) run through the FROZEN, read-only
//     normalizer — one row per open PR.
// It writes the page to `cost-display.html` next to this file: the "per-run / quota /
// cost-per-PR display" the V8-B completion matrix asked for.
//
// THE HONEST PICTURE THIS PRODUCES: FounderGate's budget is declared
// `enforcement: "policy-display-only"` and the harness does not yet METER spend, so no run or
// PR here carries a recorded cost. The generator therefore feeds the PRs in with NO cost, and
// the surface shows each PR row honestly as "not measured" — never a fabricated $0.00 — while
// still laying out the full quota + per-run + cost-per-PR structure the founder will read once
// metering is switched on. That is the real, on-disk truth today, said out loud.
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production surface module
// stays free of any fs/io surface (the VB2 no-act-edge source scan reads src/ only).
// Deterministic: same fixtures in → byte-identical page out. It only READS the two fixtures and
// WRITES one html artifact; it takes no other action, opens no network, and shells no `gh`.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeBundle } from "../../../src/collectors/github/github-collector.mjs";
import { renderSurfaceHtml } from "../../../src/v8b2/cost-display.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");

// The REAL declared quota — the same policy file the V8-A1 dashboard displays.
const budget = JSON.parse(
  readFileSync(join(ROOT, "src", "v8a1", "fixture", "mock-project", ".foundergate", "cost_budget.json"), "utf8")
);

// The REAL open PRs, via the frozen normalizer (pure over an already-fetched raw bundle — no
// network, no `gh`). Each becomes a cost-per-PR row with NO recorded cost (spend is not metered
// yet) — the surface renders that as "not measured", never $0.00.
const rawBundle = JSON.parse(
  readFileSync(join(ROOT, "src", "collectors", "github", "fixtures", "sample-bundle.json"), "utf8")
);
const bundle = normalizeBundle(rawBundle);
const prs = (bundle.pullRequests || []).map((pr) => ({
  number: pr.number,
  title: pr.title,
  // cost_usd deliberately OMITTED — the harness does not meter per-PR spend yet.
}));

// One run in this snapshot: the collector read that produced these PRs. Its cost is likewise
// unmeasured. `startedAt` is inert DATA taken from the committed bundle's collectedAt, shown
// verbatim — never a system clock.
const snapshot = {
  source: "fixture",
  collectedAt: bundle.collectedAt || null,
  budget,
  runs: [
    {
      id: "run-collector-read",
      label: `${bundle.repo} — collector read`,
      startedAt: bundle.collectedAt || null,
      // cost_usd deliberately OMITTED — spend not metered yet.
      prs,
    },
  ],
};

const html = renderSurfaceHtml(snapshot);
const out = join(HERE, "cost-display.html");
writeFileSync(out, html + "\n");
console.log(
  `wrote ${out} (${html.length} bytes) — source=${snapshot.source}, monthlyLimitUsd=${budget.monthly_limit_usd}, enforcement=${budget.enforcement}, prRows=${prs.length}`
);
