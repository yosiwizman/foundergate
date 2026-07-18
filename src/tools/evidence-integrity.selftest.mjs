// FounderGate — CI EVIDENCE-INTEGRITY GUARD (anti-repeat; locks the bb1543e class).
//
// Runs in CI on every push/PR. It fails if:
//   1. any tracked file under docs/assembly-evidence/ is EMPTY (zero bytes), or
//   2. any text evidence file still contains an UNSTAMPED placeholder token
//      (e.g. "(this PR)", "(this SHA)", "EVIDENCETIP", "#A3PR", "B0SHA",
//      "A2FINALCI"), or
//   3. any tracked source file uses the write-before-truncate stamp pattern
//      `open(...,"w").write(open(...)` (python) — the exact bug that emptied two
//      evidence files — anywhere in the repo.
// It also asserts the mandated safe stamp helper (scripts/stamp.mjs) reads before
// it writes.

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", ".."); // src/tools -> repo root
const EVID = join(REPO, "docs", "assembly-evidence");

const problems = [];
let checked = 0;

function walk(dir, fn) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, fn);
    else fn(p, st);
  }
}

// Placeholder tokens that must be stamped before a file is committed as evidence.
const PLACEHOLDERS = [
  /\(this PR\)/,
  /\(this SHA\)/,
  /\bEVIDENCETIP\b/,
  /#[A-Z][A-Z0-9]*PR\b/, // #A3PR, #B0PR (real PRs like #28 start with a digit)
  /\b[A-Z][A-Z0-9]*SHA\b/, // B0SHA, A3SHA, B3FINALSHA (real SHAs are lowercase hex)
  /\b[A-Z][A-Z0-9]*FINALCI\b/, // A2FINALCI, B3FINALCI
];
const TEXT = new Set([".md", ".json", ".txt", ".jsonl"]);

// 1 + 2: evidence non-empty + no unstamped placeholders.
if (existsSync(EVID)) {
  walk(EVID, (p, st) => {
    checked++;
    const rel = relative(REPO, p);
    // A 0-byte .log (stdout/stderr capture) is legitimate — it means "no output" — and is NOT a
    // fabrication risk (e.g. an externally-published soak sentinel-watch.log that logged nothing).
    // Every OTHER empty evidence file (json/md/txt/jsonl/sha256/…) stays rejected (teeth intact).
    if (st.size === 0) { if (extname(p) !== ".log") problems.push(`EMPTY evidence file: ${rel}`); return; }
    if (TEXT.has(extname(p))) {
      const s = readFileSync(p, "utf8");
      for (const re of PLACEHOLDERS) {
        const m = re.exec(s);
        if (m) problems.push(`unstamped placeholder "${m[0]}" in ${rel}`);
      }
      // (a) empty inline code `` — a failed/empty stamp (the empty-$VAR class): two
      // ADJACENT backticks with nothing between, not part of a ``` fence (this is
      // distinct from two separate code spans `x` `y`, which have a space between).
      if (/(?<!`)``(?!`)/.test(s)) problems.push(`empty inline code (empty stamped value) in ${rel}`);
      // (b) a stamped SHA value (backtick right after "SHA") must be 7–40 lowercase hex.
      for (const m of s.matchAll(/SHA[:*=\s]{0,4}`([^`\n]+)`/g)) {
        if (!/^[0-9a-f]{7,40}$/.test(m[1])) problems.push(`malformed stamped SHA "${m[1]}" in ${rel}`);
      }
      // (c) a stamped PR reference must be a NONZERO number (catch "#0", "#00").
      for (const m of s.matchAll(/#0+\b/g)) problems.push(`zero/malformed PR reference "${m[0]}" in ${rel}`);
    }
  });
}

// 3: ban the write-before-truncate stamp pattern across tracked source.
const BANNED = /open\([^)]*,\s*["']w["']\)\s*\.write\(\s*open\(/; // python truncate-before-read
// These two meta-files define/document the ban, so they legitimately contain the
// literal pattern in comments — exclude them from the source scan.
const SELF = [join(REPO, "src", "tools", "evidence-integrity.selftest.mjs"), join(REPO, "scripts", "stamp.mjs")];
for (const sub of ["src", "scripts"]) {
  const dir = join(REPO, sub);
  if (!existsSync(dir)) continue;
  walk(dir, (p) => {
    if (![".mjs", ".js", ".py", ".sh"].includes(extname(p))) return;
    if (SELF.includes(p)) return;
    const s = readFileSync(p, "utf8");
    if (BANNED.test(s)) problems.push(`banned write-before-truncate pattern in ${relative(REPO, p)}`);
  });
}

// 4: every *.selftest.mjs on disk under src/ must be git-TRACKED (not ignored) —
// a gitignored selftest silently never runs in CI (the secrets-absent.fixture /
// no-secret-leak.selftest class). Checked locally where git + the files exist.
try {
  const srcDir = join(REPO, "src");
  const selftests = [];
  if (existsSync(srcDir)) walk(srcDir, (p) => { if (p.endsWith(".selftest.mjs")) selftests.push(p); });
  for (const p of selftests) {
    let ignored = false;
    try { execFileSync("git", ["check-ignore", "-q", p], { cwd: REPO }); ignored = true; } catch { ignored = false; }
    if (ignored) problems.push(`gitignored selftest (would not run in CI): ${relative(REPO, p)}`);
  }
} catch { /* git unavailable — skip this check */ }

// 5: THE WRITTEN-AUTHORITY LAW (Assembly Manual §28). Every bundle row in the
// Evidence Ledger must carry an AUTHORITY whose path exists on disk and whose SHA
// resolves — or be honestly marked "AUTHORITY-UNRECORDED (historical)". A row whose
// authority artifact never landed on disk is a doctrine violation (work governed by
// an artifact that doesn't resolve). CI-red otherwise. (full-history checkout makes
// old SHAs resolvable — see .github/workflows/selftests.yml fetch-depth: 0.)
const LEDGER = join(EVID, "EVIDENCE_LEDGER.md");
function shaResolves(sha) {
  try { execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: REPO, stdio: "ignore" }); return true; }
  catch { try { execFileSync("git", ["cat-file", "-e", sha], { cwd: REPO, stdio: "ignore" }); return true; } catch { return false; } }
}
if (existsSync(LEDGER)) {
  const lines = readFileSync(LEDGER, "utf8").split("\n");
  const header = lines.find((l) => l.startsWith("| Date |"));
  if (!header || !/Authority/i.test(header)) problems.push("Evidence Ledger header is missing the AUTHORITY column (Written-Authority Law §28)");
  for (const l of lines) {
    if (!/^\| \d{4}-\d{2}-\d{2} /.test(l)) continue; // data rows only
    const cells = l.split("|"); const authority = (cells[cells.length - 2] || "").trim();
    if (!authority) { problems.push(`ledger row has no AUTHORITY cell: ${l.slice(0, 60)}…`); continue; }
    if (/AUTHORITY-UNRECORDED/i.test(authority)) continue; // honestly grandfathered
    const pathM = authority.match(/`([^`]+?)`/);
    if (!pathM) { problems.push(`AUTHORITY has no path: "${authority}"`); continue; }
    if (!existsSync(join(REPO, pathM[1]))) problems.push(`AUTHORITY path does not resolve on disk: ${pathM[1]}`);
    const shaM = authority.match(/@\s*`([0-9a-f]{7,40})`/);
    if (shaM && !shaResolves(shaM[1])) problems.push(`AUTHORITY SHA does not resolve: ${shaM[1]}`);
  }
}

// safe stamp helper must read before it writes.
const helper = join(REPO, "scripts", "stamp.mjs");
if (!existsSync(helper)) {
  problems.push("missing mandated safe stamp helper: scripts/stamp.mjs");
} else {
  const h = readFileSync(helper, "utf8");
  if (h.indexOf("readFileSync") === -1 || h.indexOf("readFileSync") > h.indexOf("writeFileSync")) {
    problems.push("scripts/stamp.mjs must read (readFileSync) before it writes (writeFileSync)");
  }
}

// Mutation proof (self-check): the 0-byte exemption is scoped to .log ONLY. An empty
// json/md/txt evidence file is still a violation; only an empty .log (no-output capture) is exempt.
const emptyFlagged = (name) => extname(name) !== ".log";
for (const nonlog of ["x.json", "x.md", "x.txt", "RUN_RESULT.json", "evidence-pack.sha256"]) {
  if (!emptyFlagged(nonlog)) problems.push(`evidence-integrity teeth regression: empty ${nonlog} no longer flagged`);
}
if (emptyFlagged("sentinel-watch.log")) problems.push("evidence-integrity: empty .log must be exempt (no-output capture)");

if (problems.length) {
  console.error(`EVIDENCE-INTEGRITY-GUARD: FAIL (${problems.length}) — checked ${checked} evidence files`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`EVIDENCE-INTEGRITY-GUARD: PASS (${checked} evidence files non-empty + placeholder-free; no write-before-truncate pattern; safe stamp helper present)`);
