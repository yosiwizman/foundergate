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

// Validate a whole report. Returns { valid, claims:[{n,line,pr,shas,resolved,reasons[]}] }.
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
  // A report with lane-claim lines is valid only if EVERY claim carries provenance.
  // A report with zero recognisable lane claims is valid (nothing is being asserted).
  const valid = claims.every((c) => c.ok);
  return { valid, claims };
}

// CLI
const invokedDirectly = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (invokedDirectly) {
  const { readFileSync } = await import("node:fs");
  const path = process.argv[2];
  if (!path) { console.error("usage: node src/tools/report-provenance.mjs <report.md>"); process.exit(2); }
  const r = validateReport(readFileSync(path, "utf8"));
  if (r.valid) { console.log(`PROVENANCE OK — ${r.claims.length} lane claim(s), all cite a resolvable PR + SHA.`); process.exit(0); }
  console.error("PROVENANCE INVALID — a bundle-completion report must cite a resolvable PR + SHA for every claimed lane:");
  for (const c of r.claims.filter((c) => !c.ok)) console.error(`  line ${c.n}: ${c.reasons.join("; ")}\n    > ${c.line}`);
  process.exit(1);
}
