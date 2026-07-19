// FounderGate V8-B VB2 — License / IP Register surface EVIDENCE GENERATOR.
//
// Plain English: this renders the standalone License/IP Register surface from REAL, on-disk facts about
// this repository, entirely offline. The whole point of the register is that a commercial/pilot claim
// must be EARNED — every recorded component needs a known license, no high/unknown license-IP risk, and
// a review on record before real use (Law 66). So this generator does not hand-type the licenses: it
// READS them from the committed `package-lock.json`, the deterministic source of truth for this repo's
// dependency licenses.
//
//   Page 1 — a CLEARED register (`register-clear.html`, fixture):
//     The same real dependencies, shown AS IF a human license review had been completed — status
//     APPROVED, a reviewer_source and date_reviewed on record. Every entry then clears, so the register
//     rolls up to "commercial/pilot: clear". This is what earned green looks like — and it is a fixture,
//     because no such review is actually recorded on disk yet.
//
//   Page 2 — a BLOCKED register (`register-blocked.html`, the real on-disk truth):
//     The exact same dependencies AS THEY STAND TODAY — no reviewer_source, no date_reviewed, status
//     UNKNOWN. Not one has been through a recorded license/IP review, so every entry blocks and the
//     register rolls up to "commercial/pilot: blocked". That is the honest current posture and a real,
//     actionable gap the surface exists to make visible: the licenses are known (Apache-2.0, MPL-2.0,
//     MIT), but "known license" is not "reviewed and cleared".
//
// The license → risk classification is derived deterministically from the SPDX id read off disk
// (permissive → none, weak copyleft e.g. MPL/LGPL → medium, strong copyleft e.g. GPL/AGPL → high,
// unrecognized → unknown) — the engine, not this tool, decides what blocks.
//
// It is a build/evidence tool, kept OUT of src/ on purpose so the production surface module stays free
// of any fs/io surface (the VB2 no-act-edge source scan reads src/ only). Deterministic: package-lock.json
// is committed, so the same tree in → byte-identical pages out. It only READS committed source and
// WRITES html artifacts; it takes no other action, opens no network, and reviews/approves nothing.

import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveRegisterView, renderSurfaceHtml } from "../../../src/v8b2/license-ip-register.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");

// ── Read the REAL dependency licenses off disk (package-lock.json is the committed source of truth) ──
const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

// npm-registry vendors for the known packages (attribution/provenance context, not a license claim).
const VENDOR = {
  "@playwright/test": "npm (Microsoft)",
  playwright: "npm (Microsoft)",
  "playwright-core": "npm (Microsoft)",
  "@axe-core/playwright": "npm (Deque Systems)",
  "axe-core": "npm (Deque Systems)",
  fsevents: "npm (fsevents)",
};

// Derive the copyleft posture of an SPDX id deterministically. The ENGINE decides what blocks; this only
// classifies the license text read off disk. Unrecognized → "unknown" (never guessed toward permissive).
function classify(spdx) {
  const s = String(spdx || "").toUpperCase();
  if (!s) return { copyleft: "unknown", redistribution: "unknown", attribution: false };
  if (/^(MIT|ISC|0BSD|BSD-2-CLAUSE|BSD-3-CLAUSE|APACHE-2\.0|UNLICENSE|CC0-1\.0)$/.test(s))
    return { copyleft: "none", redistribution: "low", attribution: s !== "0BSD" && s !== "UNLICENSE" && s !== "CC0-1.0" };
  if (/^(MPL-2\.0|LGPL|EPL|CDDL)/.test(s)) return { copyleft: "medium", redistribution: "medium", attribution: true };
  if (/^(GPL|AGPL)/.test(s)) return { copyleft: "high", redistribution: "high", attribution: true };
  return { copyleft: "unknown", redistribution: "unknown", attribution: false };
}

// Every node_modules/* package the lockfile records, with its real license.
const deps = Object.entries(lock.packages || {})
  .filter(([path]) => path.startsWith("node_modules/"))
  .map(([path, meta]) => ({ name: path.replace(/^node_modules\//, ""), version: meta.version || null, license: meta.license || null }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Build one register entry per real dependency. `reviewed` decides the two contrasting pages.
function entryFor(dep, reviewed) {
  const c = classify(dep.license);
  return {
    package_name: dep.name,
    source_repo_vendor: VENDOR[dep.name] || "npm",
    version: dep.version,
    license: dep.license, // READ from package-lock.json, never hand-typed
    // Permissive/weak-copyleft OSS licenses permit commercial use; a strong-copyleft one is a human call.
    commercial_use_allowed: c.copyleft === "high" || c.copyleft === "unknown" ? false : true,
    copied_code_or_adapter_only: "subprocess", // dev-only test tooling invoked as a subprocess, not shipped
    attribution_required: c.attribution,
    copyleft_risk: c.copyleft,
    redistribution_risk: c.redistribution,
    output_terms: "N/A — build/test tooling, not redistributed in the product",
    model_provider_terms: "N/A",
    human_legal_review_required: c.copyleft === "high",
    status: reviewed ? "APPROVED" : "UNKNOWN",
    date_reviewed: reviewed ? "2026-07-18" : null,
    reviewer_source: reviewed ? "founder + OSS-license checklist (V8-B evidence)" : null,
  };
}

const PAGES = [
  { file: "register-clear.html", reviewed: true, note: "reviewed + APPROVED (fixture — no such review is recorded on disk yet)" },
  { file: "register-blocked.html", reviewed: false, note: "the real on-disk posture — no review recorded, status UNKNOWN" },
];

for (const { file, reviewed, note } of PAGES) {
  const entries = deps.map((d) => entryFor(d, reviewed));
  const snapshot = { source: "fixture", collectedAt: "2026-07-18", register: { entries } };
  const view = deriveRegisterView(snapshot);
  const html = renderSurfaceHtml(snapshot);
  writeFileSync(join(HERE, file), html + "\n");
  console.log(
    `wrote ${file} (${html.length} bytes) — ${entries.length} entries [${note}] => clearance=${view.clearance}, cleared=${view.clearedCount}, blocking=${view.blockingCount}, needLegalReview=${view.legalReviewCount}`
  );
}

// The project's own IP fact, surfaced in the REPORT (not rendered as an entry): package.json declares
// no `license` field, so FounderGate's own code has no declared license on record — a real blocker for
// any commercial/pilot claim about the product itself.
console.log(
  `\non-disk facts: ${deps.length} dependencies read from package-lock.json (${deps.map((d) => `${d.name}=${d.license}`).join(", ")}); project package.json license field = ${pkg.license ? pkg.license : "NONE (undeclared)"}, private=${pkg.private === true}`
);
