// FounderGate V8-B VB2 — EVIDENCE VIEWER evidence generator.
//
// Plain English: this is the disk-reading half of the Evidence Viewer. It opens a REAL evidence
// bundle under `docs/testing/evidence/`, builds a descriptor of what is actually there — every
// file that exists on disk, each file's byte size, and (crucially) whether that file is covered by
// the bundle's `ARTIFACT_HASHES.sha256` manifest — plus the recorded facts (`RESULT.json`), the
// observed steps (`DOM_ACTIONS.jsonl`), the screenshot names (`SCREENSHOT_INDEX.json`) and the
// observed counts, hands that descriptor to the PURE viewer
// (`src/v8b2/evidence-viewer.mjs`), and writes the rendered per-bundle page next to this file —
// the "readable viewer surface" the V8-B completion matrix asked for (Evidence Viewer = NOT BUILT).
//
// The honesty of the read is the whole point: a file is marked VERIFIABLE only if the manifest
// actually hashes it. A file present on disk but NOT in the manifest gets NO hash — the viewer
// says "cannot be verified" rather than pretending it is proven (Law 54). To show BOTH states of
// the same viewer on the same real disk, it renders two bundles: one that is fully self-verifying,
// and one that carries no hash manifest at all.
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production viewer module stays
// free of any fs/io surface (the VB2 no-act-edge scan reads src/ only). Deterministic: it sorts
// files and reads inert bytes, so the same disk in → byte-identical page out. It only READS the
// bundle and WRITES the html artifacts; it takes no other action — it opens no browser, re-runs
// nothing, and recomputes no hash (the viewer shows the manifest's declared hashes as-is).

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { renderViewSurfaceHtml, normalizeView } from "../../../src/v8b2/evidence-viewer.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const EVIDENCE_DIR = join(REPO, "docs", "testing", "evidence");
const MANIFEST_FILE = "ARTIFACT_HASHES.sha256";
const rel = (p) => p.replace(REPO + "/", "");

function readText(p) {
  try { return readFileSync(p, "utf8"); } catch { return null; }
}
function readJson(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

// Every file under `dir`, recursively, as bundle-relative paths — sorted for determinism. Hidden
// dotfiles are skipped. This is the ACTUAL contents of the bundle, not a guessed list.
function listFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full, base));
    else out.push(relative(base, full));
  }
  return out.sort();
}

// Parse a `path  sha256` sha256sum-style manifest into { relPath -> hash }. Format is
// "<64-hex>␣␣<path>" per line; anything else is ignored (never invents a hash).
function parseManifest(text) {
  const map = {};
  if (!text) return map;
  for (const line of text.split("\n")) {
    const m = line.match(/^([0-9a-fA-F]{64})\s+(.+)$/);
    if (m) map[m[2].trim()] = m[1];
  }
  return map;
}

// Build the descriptor the pure viewer consumes from ONE real bundle directory. Every field is
// READ from disk or DECLARED ABSENT. The manifest is built from the ACTUAL files on disk, each
// looked up in ARTIFACT_HASHES.sha256 — a file the manifest does not cover carries no hash.
function describeBundle(name, surface) {
  const dir = join(EVIDENCE_DIR, name);
  const result = readJson(join(dir, "RESULT.json"));
  const hashes = parseManifest(readText(join(dir, MANIFEST_FILE)));
  const files = listFiles(dir).filter((f) => f !== MANIFEST_FILE); // the manifest cannot hash itself
  const manifest = files.map((f) => ({
    path: f,
    sha256: hashes[f] || null,
    bytes: statSync(join(dir, f)).size,
  }));

  // facts: the top-level SCALAR fields of RESULT.json, shown verbatim (nothing interpreted).
  const facts = result
    ? Object.entries(result).filter(([, v]) => v === null || ["string", "number", "boolean"].includes(typeof v))
        .map(([key, value]) => ({ key, value }))
    : [];

  // observed steps: DOM_ACTIONS.jsonl, one honest line per action.
  const dom = (readText(join(dir, "DOM_ACTIONS.jsonl")) || "")
    .split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => { try { const a = JSON.parse(l); return a.action + (a.selector ? ` ${a.selector}` : a.url ? ` ${a.url}` : a.run ? ` ${a.run}` : ""); } catch { return l; } });

  const shotIndex = readJson(join(dir, "SCREENSHOT_INDEX.json"));
  const screenshots = shotIndex && Array.isArray(shotIndex.screenshots) ? shotIndex.screenshots : [];

  return {
    id: name,
    surface,
    path: rel(dir),
    state: result ? result.foreground_state : null,
    facts,
    manifest,
    timeline: dom,
    screenshots,
    counts: result ? { console: result.console_entries, network: result.network_entries, page_errors: result.page_errors } : {},
  };
}

// A file present on disk but not in the manifest — the honest "unverifiable" case a viewer must
// surface. `launcher` on the committed tree is exactly this: real files, no hash manifest.
function render(name, surface, outFile) {
  const desc = describeBundle(name, surface);
  const v = normalizeView(desc);
  const html = renderViewSurfaceHtml(desc);
  const out = join(HERE, outFile);
  writeFileSync(out, html + "\n");
  const flag = v.unsupported_claim
    ? "UNSUPPORTED CLAIM (PASS not self-verifying)"
    : v.self_verifying ? "self-verifying" : v.file_count === 0 ? "no manifest" : "partial (some files unhashed)";
  console.log(`wrote ${rel(out)} (${html.length} bytes) — bundle "${name}": ${VERDICT_WORD(v.verdict)}, ${v.verifiable_files}/${v.file_count} files hashed → ${flag}`);
}

function VERDICT_WORD(v) { return v; }

// 1) the rich, fully self-verifying founder-surface bundle: every file it lists is hashed.
render("foreground-founder-surface-final", "phase7.1-safety-check", "bundle-view-surface.html");
// 2) the launcher bundle: real files, NO ARTIFACT_HASHES.sha256 — the viewer says so out loud.
render("launcher", "finder-launch-capture", "bundle-view-unverifiable.html");
