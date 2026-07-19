// FounderGate V8-B VB2 — PLAYWRIGHT EVIDENCE INDEX evidence generator.
//
// Plain English: this is the disk-reading half of the Playwright evidence system. It walks the
// REAL evidence bundles under `docs/testing/evidence/`, plus the raw `@playwright/test` JSON
// reporter output, turns each into a plain descriptor (what state it recorded, how many
// screenshots, whether it kept a trace/video/hash-manifest), hands that set to the PURE indexer
// (`src/v8b2/playwright-evidence-index.mjs`), and writes the rendered index to
// `evidence-index-surface.html` next to this file — the generalized-indexer evidence the V8-B
// completion matrix asked for (Playwright evidence system = *PARTIAL*, missing "generalized
// evidence indexer"; today "Phase7.1 safety-check only").
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production indexer module stays
// free of any fs/io surface (the VB2 no-act-edge scan reads src/ only). Deterministic: it sorts
// bundles by id and reads inert files, so the same disk in → byte-identical page out. It only
// READS the bundles and WRITES one html artifact; it takes no other action — it never runs a
// Playwright test or opens a browser (that stays in the capture tools).

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSurfaceHtml, indexDigest } from "../../../src/v8b2/playwright-evidence-index.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const EVIDENCE_DIR = join(REPO, "docs", "testing", "evidence");
const rel = (p) => p.replace(REPO + "/", "");

// Read a JSON file, or null if it is absent / unreadable — never invent its contents.
function readJson(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

// Count files inside a bundle sub-directory (e.g. screenshots/) — 0 if the directory is absent.
function countFiles(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return 0;
  return readdirSync(dir).filter((f) => !f.startsWith(".")).length;
}

// Turn one on-disk evidence-bundle directory into a descriptor for the indexer. Every field is
// READ from disk or DECLARED ABSENT — nothing is guessed. A RESULT.json (the founder-surface
// capture shape) supplies the recorded state and its own artifact counts; when it is absent we
// fall back to what the directory itself declares (a lone screenshot, a hash manifest).
function describeDir(name) {
  const dir = join(EVIDENCE_DIR, name);
  const result = readJson(join(dir, "RESULT.json"));
  const hasTrace = existsSync(join(dir, "trace")) && countFiles(join(dir, "trace")) > 0;
  const hasVideo = existsSync(join(dir, "video")) && countFiles(join(dir, "video")) > 0;
  const hasHashes = existsSync(join(dir, "ARTIFACT_HASHES.sha256"));
  const screenshotDir = countFiles(join(dir, "screenshots"));
  const looseShots = readdirSync(dir).filter((f) => f.endsWith(".png")).length;
  // surface: read the recorded UI contract when present, else label by what produced the bundle.
  const surface = result && result.ui_contract === "phase7.1-neutral-first-v1"
    ? "phase7.1-safety-check"
    : (result ? "founder-surface-capture" : "misc-capture");
  return {
    id: name,
    surface,
    path: rel(dir),
    state: result ? result.foreground_state : null,
    screenshots: result && typeof result.screenshots === "number" ? result.screenshots : (screenshotDir || looseShots),
    video: result ? !!result.video : hasVideo,
    trace: result ? !!result.trace : hasTrace,
    hashes: hasHashes,
    dom_assertions: result && typeof result.dom_assertions === "number" ? result.dom_assertions : 0,
    downloads: countFiles(join(dir, "downloads")),
  };
}

// The raw @playwright/test JSON reporter output is ALSO a Playwright evidence bundle — from a
// different surface (the headless CI reporter) with a different shape. Indexing it proves the
// indexer is generalized, not wired to the founder-surface RESULT.json shape. We read its stats
// (expected = passed, unexpected = failed) and declare only the artifacts it actually carries.
function describeReporter() {
  const p = join(EVIDENCE_DIR, "playwright-results.json");
  const j = readJson(p);
  if (!j) return null;
  const stats = j.stats || {};
  return {
    id: "playwright-results.json",
    surface: "playwright-test-reporter",
    path: rel(p),
    passed: typeof stats.expected === "number" ? stats.expected : undefined,
    failed: typeof stats.unexpected === "number" ? stats.unexpected : undefined,
    // the top-level reporter json is a single results file: no bundled screenshots/trace/hashes
    // of its own. We do NOT borrow another bundle's artifacts to dress it up (Law 54).
    screenshots: 0, video: false, trace: false, hashes: false, dom_assertions: 0, downloads: 0,
  };
}

// Enumerate every evidence sub-directory on disk (sorted for determinism), describe each, and add
// the reporter bundle. This is the generalized read: any surface's bundle that lands here is
// indexed the same way with no code change.
const dirs = readdirSync(EVIDENCE_DIR)
  .filter((f) => statSync(join(EVIDENCE_DIR, f)).isDirectory())
  .sort();
const bundles = dirs.map(describeDir);
const reporter = describeReporter();
if (reporter) bundles.push(reporter);

const html = renderSurfaceHtml(bundles);
const out = join(HERE, "evidence-index-surface.html");
writeFileSync(out, html + "\n");

const d = indexDigest(bundles);
console.log(`wrote ${rel(out)} (${html.length} bytes)`);
console.log(`indexed ${d.total} bundles across ${Object.keys(d.by_surface).length} surface(s): ${JSON.stringify(d.by_verdict)}`);
console.log(`backed by core evidence: ${d.supported} · partial: ${d.partial_evidence} · unsupported claims: ${d.unsupported_claims}${d.unsupported_claims ? " -> " + d.unsupported_claim_ids.join(", ") : ""}`);
