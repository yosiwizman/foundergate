// FounderGate — BUNDLE-COMPLETION REPORT PROVENANCE validator (Assembly Manual §26).
//
// THE PROVENANCE LAW: a bundle-completion report is INVALID unless every claimed lane
// cites a PR and a SHA that RESOLVE ON DISK (git cat-file). This exists because a
// "VA-REPAIR-5" bundle was believed-reviewed but had never been built — no branch, no
// PR, no commit. A claim with no resolvable SHA is a phantom; this validator makes the
// founder's advisor able to reject it mechanically.
//
//   node src/tools/report-provenance.mjs <report.md>   # exits 1 if invalid
//
// Pure Node + git. `shaResolves` shells out to `git cat-file -e` (git is present in dev
// and in CI checkout). The validator itself never trusts prose — only objects that the
// repository can produce.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// A "lane-claim" line asserts a lane/deliverable is done. It names a lane token
// (L0, J3, PG5, FC4, D2, AC1, R1, F2, VA-REPAIR-4 …) AND is either a list item / table
// row or carries a completion verb. Markdown HEADERS are never claims (they scope, not
// assert), so a "## VA-REPAIR-4 complete" heading is not required to carry provenance.
const LANE_TOKEN = /\b([A-Z]{1,3}\d{1,2}|VA-[A-Z0-9-]+)\b/;
const CLAIM_VERB = /\b(built|done|complete|completed|shipped|merged|landed|implemented|fixed|added|delivered)\b/i;
// A 7–40 hex SHA that is NOT part of a longer word.
const SHA_RE = /\b([0-9a-f]{7,40})\b/gi;
const PR_RE = /(?:PR\s*)?#(\d+)\b/i;

export function extractShas(text) {
  const out = new Set();
  for (const m of String(text).matchAll(SHA_RE)) {
    const s = m[1].toLowerCase();
    // ignore pure-decimal look-alikes and obvious non-shas (all same char)
    if (/^[0-9]+$/.test(s)) continue;
    if (/^(.)\1+$/.test(s)) continue;
    out.add(s);
  }
  return [...out];
}

// Does a SHA resolve to a real git object in THIS repository?
export function shaResolves(sha, cwd = process.cwd()) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd, stdio: "ignore" });
    return true;
  } catch {
    try { execFileSync("git", ["cat-file", "-e", sha], { cwd, stdio: "ignore" }); return true; }
    catch { return false; }
  }
}

// Lines that claim a lane is complete. Each MUST carry a PR ref and a resolvable SHA.
export function claimLines(text) {
  return String(text).split(/\r?\n/).map((line, i) => ({ n: i + 1, line }))
    .filter(({ line }) => {
      if (/^\s*#/.test(line)) return false;              // markdown headers scope, never claim
      if (!LANE_TOKEN.test(line)) return false;          // must name a lane token
      const isListOrTable = /^\s*[-*|]/.test(line);      // list item or table row
      return isListOrTable || CLAIM_VERB.test(line);
    });
}

// THE WRITTEN-AUTHORITY LAW (Assembly Manual §28) applied to a completion report: the
// disk-proof table carries an AUTHORITY column; every authority must resolve (path
// exists + SHA resolves) or be honestly marked "AUTHORITY-UNRECORDED (historical)". An
// unresolvable authority is INVALID exactly like a phantom SHA.
export function authorityColumnCells(text) {
  const lines = String(text).split(/\r?\n/);
  const cells = []; let colIdx = -1;
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) { colIdx = -1; continue; } // table ended
    const parts = line.split("|");
    if (colIdx === -1) { // looking for the header row that names an AUTHORITY column
      const idx = parts.findIndex((c) => /authorit/i.test(c));
      if (idx !== -1) colIdx = idx;
      continue;
    }
    if (/^[\s|:-]+$/.test(line)) continue; // separator row
    const cell = (parts[colIdx] || "").trim();
    if (cell) cells.push(cell);
  }
  return cells;
}

export function validateAuthorityCells(text, cwd = process.cwd()) {
  return authorityColumnCells(text).map((cell) => {
    if (/AUTHORITY-UNRECORDED/i.test(cell)) return { cell, ok: true, historical: true, reasons: [] };
    const p = cell.match(/`([^`]+?)`/);
    const sha = cell.match(/@\s*`([0-9a-f]{7,40})`/);
    const reasons = [];
    if (!p) reasons.push("no authority path");
    else if (!existsSync(resolve(cwd, p[1]))) reasons.push(`authority path does not resolve on disk: ${p[1]}`);
    if (sha && !shaResolves(sha[1], cwd)) reasons.push(`authority SHA does not resolve: ${sha[1]}`);
    return { cell, ok: reasons.length === 0, reasons };
  });
}

// THE HONEST-DURATION & SOAK-PROOF LAW (Assembly Manual §29): a report containing a
// "… SOAK PASS" line must carry parseable start/end timestamps whose delta ≥ the
// claimed duration — else INVALID, exactly like a phantom SHA. (A soak that physically
// cannot have run for the claimed time is not a pass.)
const TS_RE = /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/g;
export function validateSoakClaims(text) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /(\d+)\s*-?\s*hour[^\n]*soak\s+pass/i.exec(lines[i]);
    if (!m) continue;
    const claimedHours = parseInt(m[1], 10);
    // start/end timestamps may sit on the PASS line or in the soak block just below it.
    const block = lines.slice(i, i + 12).join("\n");
    const stamps = [...block.matchAll(TS_RE)].map((x) => Date.parse(x[1].replace(" ", "T"))).filter((n) => !Number.isNaN(n));
    const reasons = [];
    if (stamps.length < 2) reasons.push(`SOAK PASS lacks two parseable start/end timestamps`);
    else {
      const spanH = (Math.max(...stamps) - Math.min(...stamps)) / 3600000;
      if (spanH + 1e-6 < claimedHours) reasons.push(`SOAK PASS claims ${claimedHours}h but start/end span only ${spanH.toFixed(2)}h`);
    }
    out.push({ line: lines[i].trim(), claimedHours, ok: reasons.length === 0, reasons });
  }
  return out;
}

// Validate a whole report. Returns { valid, claims:[...], authorities:[...], soaks:[...] }.
export function validateReport(text, cwd = process.cwd()) {
  const claims = claimLines(text).map(({ n, line }) => {
    const shas = extractShas(line);
    const pr = (line.match(PR_RE) || [])[1] || null;
    const resolved = shas.filter((s) => shaResolves(s, cwd));
    const reasons = [];
    if (!pr) reasons.push("no PR reference (#123)");
    if (!shas.length) reasons.push("no SHA cited");
    else if (!resolved.length) reasons.push(`SHA(s) do not resolve on disk: ${shas.join(", ")}`);
    return { n, line: line.trim(), pr, shas, resolved, ok: reasons.length === 0, reasons };
  });
  // A report with lane-claim lines is valid only if EVERY claim carries provenance
  // AND every declared AUTHORITY resolves (Written-Authority Law). A report with zero
  // recognisable lane claims / authorities is valid (nothing is being asserted).
  const authorities = validateAuthorityCells(text, cwd);
  const soaks = validateSoakClaims(text);
  const valid = claims.every((c) => c.ok) && authorities.every((a) => a.ok) && soaks.every((s) => s.ok);
  return { valid, claims, authorities, soaks };
}

// CLI
const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  const { readFileSync } = await import("node:fs");
  const path = process.argv[2];
  if (!path) { console.error("usage: node src/tools/report-provenance.mjs <report.md>"); process.exit(2); }
  const r = validateReport(readFileSync(path, "utf8"));
  if (r.valid) { console.log(`PROVENANCE OK — ${r.claims.length} lane claim(s), all cite a resolvable PR + SHA.`); process.exit(0); }
  console.error("PROVENANCE INVALID — every claimed lane must cite a resolvable PR + SHA, and every AUTHORITY must resolve on disk:");
  for (const c of r.claims.filter((c) => !c.ok)) console.error(`  line ${c.n}: ${c.reasons.join("; ")}\n    > ${c.line}`);
  for (const a of (r.authorities || []).filter((a) => !a.ok)) console.error(`  authority: ${a.reasons.join("; ")}\n    > ${a.cell}`);
  for (const s of (r.soaks || []).filter((s) => !s.ok)) console.error(`  soak: ${s.reasons.join("; ")}\n    > ${s.line}`);
  process.exit(1);
}
