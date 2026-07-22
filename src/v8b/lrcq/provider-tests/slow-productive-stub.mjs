#!/usr/bin/env node
// FounderGate LRCQ — SLOW deterministic provider stub (TEST-ONLY). Identical protocol behavior to
// productive-stub, but sleeps first so a supervised run stays observably active after the launcher exits
// (lets the real-process detached test observe supervisor survival, heartbeat advance, provider-stub
// lineage, and a separate witness attaching). NEVER a real model. The sleep duration is fixed here so it
// needs no environment variable (the provider env is scrubbed to PATH/HOME only).
import { execFileSync } from "node:child_process";
// TEST-ONLY: answer the provider-binding version check (FG-LRCQ-ACT-022) BEFORE the sleep, so pre-consumption
// verification is fast and deterministic.
if (process.argv.includes("--version")) { console.log("stub-1"); process.exit(0); }
try { execFileSync("sleep", ["3"]); } catch { /* sleep unavailable; proceed */ }
await import("./productive-stub.mjs");
