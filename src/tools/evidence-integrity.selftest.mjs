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
    if (st.size === 0) { problems.push(`EMPTY evidence file: ${rel}`); return; }
    if (TEXT.has(extname(p))) {
      const s = readFileSync(p, "utf8");
      for (const re of PLACEHOLDERS) {
        const m = re.exec(s);
        if (m) problems.push(`unstamped placeholder "${m[0]}" in ${rel}`);
      }
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

if (problems.length) {
  console.error(`EVIDENCE-INTEGRITY-GUARD: FAIL (${problems.length}) — checked ${checked} evidence files`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`EVIDENCE-INTEGRITY-GUARD: PASS (${checked} evidence files non-empty + placeholder-free; no write-before-truncate pattern; safe stamp helper present)`);
