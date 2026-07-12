// FounderGate — §29 SOAK RUNNER. Drives the reliability-soak accumulator against a
// periodic health probe over REAL wall-clock, persisting state each tick, and emits a
// valid "<N>-HOUR SOAK PASS" line ONLY when the run genuinely spans the claim AND meets
// the SLO. Designed to run as a PERSISTENT process (8–9h then 24h) OUTSIDE a single
// session — the Honest-Duration & Soak-Proof Law (Assembly Manual §29) requires real
// timestamps spanning the claimed duration; this tool cannot fabricate one.
//
//   node src/tools/soak-run.mjs --claim 8 --interval 900 --state <file> [--sha <sha>] [--probe "<cmd>"]
//
// Each tick: run the health probe, record a window with a REAL timestamp, save state,
// print the current soak report. On completion (span ≥ claim, SLO met) it writes the
// PASS report next to the state file and exits 0. Ctrl-C to stop early (state persists).

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { newSoak, addWindow, slo, soakReport, passed } from "./reliability-soak.mjs";

function arg(name, def) { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; }

const claimHours = Number(arg("claim", "8"));
const intervalSec = Number(arg("interval", "900"));
const statePath = arg("state", join("docs", "assembly-evidence", "VB1", "soak", `soak-${claimHours}h.json`));
const sha = arg("sha", "UNKNOWN");
const probe = arg("probe", null); // shell command; healthy iff exit 0. Default: light internal check.

function loadSoak() {
  if (existsSync(statePath)) {
    try { const s = JSON.parse(readFileSync(statePath, "utf8")); if (s && s.claimHours) return s; } catch { /* fall through */ }
  }
  return newSoak(claimHours);
}
function saveSoak(soak) { mkdirSync(dirname(statePath), { recursive: true }); writeFileSync(statePath, JSON.stringify(soak, null, 2) + "\n"); }

// One health sample. Healthy iff the probe exits 0 (or, by default, the repo is readable
// and package.json parses — a light liveness check).
function sample() {
  try {
    if (probe) { execSync(probe, { stdio: "ignore" }); return true; }
    JSON.parse(readFileSync("package.json", "utf8"));
    return true;
  } catch { return false; }
}

const soak = loadSoak();
console.log(`[soak] claim ${claimHours}h, interval ${intervalSec}s, state ${statePath}, sha ${sha}`);
console.log(`[soak] this is a REAL wall-clock run — it will not "complete" faster than ${claimHours}h (§29).`);

function tick() {
  const ok = sample();
  addWindow(soak, { ts: new Date().toISOString(), ok: ok ? 1 : 0, fail: ok ? 0 : 1 });
  saveSoak(soak);
  const s = slo(soak);
  console.log(`[soak] ${new Date().toISOString()} span ${s.spanHours.toFixed(3)}h/${claimHours}h · avail ${(s.availability * 100).toFixed(2)}% · samples ${s.samples}`);
  if (passed(soak)) {
    const report = soakReport(soak, { sha });
    const out = statePath.replace(/\.json$/, "-PASS.txt");
    writeFileSync(out, report + "\n");
    console.log(`\n${report}\n[soak] PASS written to ${out}`);
    process.exit(0);
  }
}

tick();
const timer = setInterval(tick, intervalSec * 1000);
process.on("SIGINT", () => { clearInterval(timer); console.log("\n[soak] stopped (state persisted); NOT a pass — still running."); process.exit(0); });
