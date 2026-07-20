#!/usr/bin/env node
// Deterministic Claude-CLI STUB for LRCQ provider tests. Reproduces CLI process
// behaviour WITHOUT any model request. Mode is read from ./stub-mode in the cwd
// (the adapter sets cwd = the job worktree), so no env leakage is needed.
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
const mode = existsSync("stub-mode") ? readFileSync("stub-mode", "utf8").trim() : "success";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  switch (mode) {
    case "success": process.stdout.write(JSON.stringify({ type: "result", result: "ok", is_error: false })); return process.exit(0);
    case "fail": process.stderr.write("stub failure\n"); return process.exit(1);
    case "malformed": process.stdout.write("this is not json"); return process.exit(0);
    case "noout": return process.exit(0);
    case "overflow": { const chunk = "x".repeat(64 * 1024); for (let i = 0; i < 64; i++) process.stdout.write(chunk); await sleep(2000); return process.exit(0); }
    case "timeout": await sleep(60000); return process.exit(0);
    case "ignore-term": process.on("SIGTERM", () => {}); await sleep(60000); return process.exit(0);
    case "needs-kill": process.on("SIGTERM", () => {}); process.on("SIGINT", () => {}); await sleep(60000); return process.exit(0);
    case "child": { const gc = spawn(process.execPath, ["-e", "setTimeout(()=>{},60000)"], { stdio: "ignore", detached: false }); try { writeFileSync("grandchild.pid", String(gc.pid) + "\n"); } catch {} await sleep(60000); gc.kill(); return process.exit(0); }
    default: process.stdout.write(JSON.stringify({ result: "ok" })); return process.exit(0);
  }
}
main();
