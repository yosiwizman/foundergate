// FounderGate V8-B VB2 — GitHub integration cards surface EVIDENCE GENERATOR.
//
// Plain English: this renders the dedicated GitHub Integration Cards surface from the REAL
// committed collector fixture (src/collectors/github/fixtures/sample-bundle.json), run through
// the FROZEN, read-only collector normalizer — the same data path FounderGate uses for a live
// `gh` read, minus the network. It writes the page to `github-integration-cards.html` next to
// this file: the "read-only repo/PR/branch/file cards" the V8-B completion matrix asked for.
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production surface module
// stays free of any fs/io surface (the VB2 no-act-edge proof scans src/ only). Deterministic:
// same fixture in → byte-identical page out. It only READS the fixture and WRITES one html
// artifact; it takes no other action, opens no network, and shells no `gh`.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeBundle } from "../../../src/collectors/github/github-collector.mjs";
import { renderSurfaceHtml } from "../../../src/v8b2/github-cards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// Read the committed sample bundle and normalize it through the frozen collector. normalizeBundle
// is PURE over an already-fetched raw bundle — no network, no `gh` — so this is fully offline.
const raw = JSON.parse(
  readFileSync(join(HERE, "..", "..", "..", "src", "collectors", "github", "fixtures", "sample-bundle.json"), "utf8")
);
const bundle = normalizeBundle(raw);

const html = renderSurfaceHtml(bundle);
const out = join(HERE, "github-integration-cards.html");
writeFileSync(out, html + "\n");
console.log(`wrote ${out} (${html.length} bytes) — source=${bundle.source}, openPrCount=${bundle.openPrCount}`);
