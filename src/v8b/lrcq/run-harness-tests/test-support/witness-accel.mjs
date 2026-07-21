#!/usr/bin/env node
// FounderGate LRCQ — TEST-ONLY accelerated WITNESS entry point (FG-LRCQ-ACT-019).
//
// This is the ONLY caller that passes a shortened window to the production witnessWithTiming() core, so a
// real-process test can observe a SEPARATE witness process attach without a 12-minute wall-clock wait. It
// is structurally ABSENT from the production import graph: no production module imports it, and the
// production witness entry point (witness-main.mjs `witness()` / its CLI) has NO override path and pins the
// immutable WITNESS_PRODUCTION_MS = 720000 window. Read-only — it never writes run state.
import { readFileSync } from "node:fs";
import { witnessWithTiming } from "../../run-harness/witness-main.mjs";

const ci = process.argv.indexOf("--config");
if (ci < 0 || !process.argv[ci + 1]) { console.error("usage: witness-accel.mjs --config <cfg.json>  (TEST ONLY)"); process.exit(2); }
const cfg = JSON.parse(readFileSync(process.argv[ci + 1], "utf8"));
const totalMs = Number(cfg.acceleratedTotalMs || 600);
const polls = Number(cfg.acceleratedPolls || 4);
witnessWithTiming(cfg, { totalMs, polls })
  .then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(r.result === "HEALTHY_CONTINUE" || r.result === "COMPLETED_HEALTHY" ? 0 : (r.result === "FAILED" ? 1 : 2)); })
  .catch((e) => { console.error("witness-accel error:", e && e.message); process.exit(3); });
