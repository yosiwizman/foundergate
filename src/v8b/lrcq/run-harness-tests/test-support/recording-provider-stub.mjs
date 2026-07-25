#!/usr/bin/env node
// FounderGate LRCQ — TEST-SUPPORT RECORDING provider stub (FG-FCHK-197-B / FG-FCHK-197-E).
// Structurally test-only. It is a DETERMINISTIC stand-in for the productive provider that APPENDS ONE LINE
// PER EXECUTION to the log named by FG_SPAWN_LOG, so a test can count ACTUAL provider spawns directly
// instead of inferring "zero spawn" from some other artefact. It never contacts a model.
//
// The log lives NEXT TO THIS FILE (`<thisfile>.spawns.log`), deliberately NOT in an environment variable:
// the production boundary SCRUBS the child environment down to PATH and HOME, so an env-carried log path
// would silently never arrive and "zero spawns" would then be an artefact of the scrubbing rather than a
// measurement. Tests copy this stub into their own disposable world and count that world's copy's log.
//
// Each line is JSON: { pid, max_budget_usd, add_dir, argv_len }.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SPAWN_LOG_SUFFIX = ".spawns.log";
const argv = process.argv.slice(2);
const at = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
const log = fileURLToPath(import.meta.url) + SPAWN_LOG_SUFFIX;
{
  try {
    appendFileSync(log, JSON.stringify({
      pid: process.pid,
      max_budget_usd: at("--max-budget-usd"),
      add_dir: at("--add-dir"),
      argv_len: argv.length,
    }) + "\n");
  } catch { /* the count is what matters; a logging failure must not change behaviour */ }
}
// Behave like the deterministic success mode of the ordinary stub so a POSITIVE route still completes.
const mode = existsSync("stub-mode") ? readFileSync("stub-mode", "utf8").trim() : "success";
if (mode === "fail") { process.stdout.write(JSON.stringify({ result: "failed" }) + "\n"); process.exit(3); }
process.stdout.write(JSON.stringify({ type: "result", subtype: "success", result: "recording stub ok", is_error: false }) + "\n");
process.exit(0);
