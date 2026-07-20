// FounderGate LRCQ — ONE-SANCTIONED-REAL-ROUTE proof (FG-LRCQ-FINAL-001).
// Proves the controller holds NO real-provider authority and there is exactly one production
// launcher + one provider spawn route. Static source scans + behavioral checks. No real Claude.
import { Controller, MODE } from "../controller.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const LRCQ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = resolve(LRCQ, "../../..");

// walk all production .mjs (exclude *-tests dirs + *.selftest)
function prodFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (/-tests$/.test(e)) continue; out.push(...prodFiles(p)); }
    else if (e.endsWith(".mjs") && !e.endsWith(".selftest.mjs")) out.push(p);
  }
  return out;
}
const lrcqProd = prodFiles(LRCQ);
const launcherDir = join(REPO, "tools/terminal0/lrcq");
const launcherFiles = readdirSync(launcherDir).filter((f) => f.endsWith(".mjs")).map((f) => join(launcherDir, f));

// ---- behavioral: stepReal refuses, invokes/ seals/ completes nothing ----
{ const c = new Controller({ run_id: "x", now: 1, maxWidth: 1, mode: MODE.REAL });
  c.load([{ job_id: "j", title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/j.mjs"], forbidden_files: [], branch: "lane/j", worktree: "/wt/j", expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" }]);
  c.refill();
  const r = await c.stepReal("j", {}, {}, {});
  ok("01 stepReal refuses with REAL_EXECUTION_REQUIRES_RUN_HARNESS", r.ok === false && r.reason === "REAL_EXECUTION_REQUIRES_RUN_HARNESS");
  ok("02 stepReal invoked no provider", r.invoked_provider === false);
  ok("03 stepReal completed nothing", r.completed === false && c.byId.get("j").status !== "COMPLETED");
  ok("04 stepReal sealed nothing", r.sealed === false && !c.events.some((e) => e.event_type === "evidence_sealed"));
  ok("05 stepReal consumed no lease + created no second route", r.lease_consumed === false && r.second_route_created === false);
  ok("06 stepReal points callers to the single sanctioned launcher route", /run-five-hour\.mjs/.test(r.sanctioned_route) && /runHarness/.test(r.sanctioned_route)); }

// ---- static: controller imports NO provider / activation schema ----
{ const src = readFileSync(join(LRCQ, "controller.mjs"), "utf8");
  ok("07 controller.mjs imports no real-provider", !/from\s+["']\.\/provider\/real-provider/.test(src));
  ok("08 controller.mjs imports no activation-schema", !/from\s+["']\.\/provider\/activation-schema/.test(src));
  ok("09 controller.mjs never calls providerRunJob/runJob", !/providerRunJob\(|\brunJob\(/.test(src));
  ok("10 stepReal body calls no _applyOutcome", !/stepReal[\s\S]*?_applyOutcome/.test(src.slice(src.indexOf("async stepReal"), src.indexOf("async stepReal") + 600))); }

// ---- static: exactly ONE provider spawn route ----
{ const spawners = lrcqProd.filter((f) => /\bspawn\(/.test(readFileSync(f, "utf8")));
  ok("11 exactly one production module spawns a provider process", spawners.length === 1 && /real-provider\.mjs$/.test(spawners[0])); }

// ---- static: exactly ONE production launcher (calls runHarness) ----
{ const launchers = [...lrcqProd, ...launcherFiles].filter((f) => !/harness\.mjs$/.test(f) && /runHarness\(/.test(readFileSync(f, "utf8")));
  ok("12 exactly one production launcher calls runHarness", launchers.length === 1 && /run-five-hour\.mjs$/.test(launchers[0])); }

// ---- static: NO production call site depends on stepReal ----
{ const callers = [...lrcqProd, ...launcherFiles].filter((f) => !/controller\.mjs$/.test(f) && /\.stepReal\(/.test(readFileSync(f, "utf8")));
  ok("13 no production module calls stepReal", callers.length === 0); }

// ---- static: no alternate shell executor loop in production launcher/harness ----
{ const suspect = [...launcherFiles, join(LRCQ, "run-harness/harness.mjs")].filter((f) => /exec\(|execSync|spawnSync|\/bin\/sh|bash -c/.test(readFileSync(f, "utf8")));
  ok("14 no alternate shell executor in launcher/harness", suspect.length === 0); }

console.log("\nLRCQ AUTHORITY-ROUTE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
