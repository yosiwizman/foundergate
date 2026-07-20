// FounderGate LRCQ — full-material closure: run-wide budget ledger (FG-LRCQ-ACT-012) +
// run-plan resolver & all-25 material validator (FG-LRCQ-ACT-010). Deterministic; no Claude.
import { BudgetLedger } from "../run-harness/budget-ledger.mjs";
import { resolveRunPlan, validateExecutableJob, validateAll25, runPlanDigest } from "../run-harness/run-plan.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// ---- FG-LRCQ-ACT-012 run-wide budget ledger ----
{ const L = new BudgetLedger(10); const s1 = { role: "builder", job: "j1", attempt: 1 }, s2 = { role: "checker", job: "j1", attempt: 1 };
  const r1 = L.reserve(s1, 3, 1); L.commit(s1, 3); const r2 = L.reserve(s2, 3, 0); L.commit(s2, 2);
  ok("01 builder + checker both count toward total", L.spent() === 5 && r1.ok && r2.ok); }
{ const L = new BudgetLedger(10); for (let a = 1; a <= 3; a++) { const s = { role: "builder", job: "j", attempt: a }; L.reserve(s, 2); L.commit(s, 2); }
  ok("02 retries all count toward total", L.spent() === 6); }
{ const L = new BudgetLedger(10); const a = L.reserve({ role: "builder", job: "j1", attempt: 1 }, 6), b = L.reserve({ role: "builder", job: "j2", attempt: 1 }, 6);
  ok("03 concurrent reservations cannot exceed $10 (2nd capped to remaining)", a.session_cap_usd === 6 && b.session_cap_usd === 4 && L.reserved() === 10); }
{ const L = new BudgetLedger(10); const s1 = { role: "builder", job: "j1", attempt: 1 }; L.reserve(s1, 5); L.commit(s1, 5); const r = L.reserve({ role: "builder", job: "j2", attempt: 1 }, 10);
  ok("04 a session cannot receive a $10 cap when prior sessions already spent", r.session_cap_usd === 5); }
{ const L = new BudgetLedger(10); const s = { role: "builder", job: "j", attempt: 1 }; L.reserve(s, 3); const c = L.commit(s, undefined);
  ok("05 missing cost evidence -> HELD_COST_EVIDENCE_MISSING", c.ok === false && c.reason === "HELD_COST_EVIDENCE_MISSING"); }
{ const L = new BudgetLedger(10); for (let i = 0; i < 20; i++) { const s = { role: "builder", job: "j" + i, attempt: 1 }; const r = L.reserve(s, 1); if (r.ok) L.commit(s, 1); }
  ok("06 total committed cost never exceeds $10", L.spent() <= 10 && L.overCeiling() === false); }
{ const L = new BudgetLedger(10); const s = { role: "builder", job: "j", attempt: 1 }; L.reserve(s, 10); L.commit(s, 10);
  ok("07 canStart false once ceiling reached; CONTROLLED_BUDGET_STOP", L.canStart(0.01) === false && L.reserve({ role: "checker", job: "j", attempt: 1 }, 1).reason === "CONTROLLED_BUDGET_STOP"); }
{ const L = new BudgetLedger(10); const r = L.reserve({ role: "builder", job: "j", attempt: 1 }, 10, 3); ok("08 reserve keeps checker headroom (builder capped to 7 leaving 3)", r.session_cap_usd === 7); }

// ---- FG-LRCQ-ACT-010 run-plan resolver + all-25 validator ----
const manifest = { branch_prefix: "lane/real-run-", permitted_worktree_root: "/repo-worktrees" };
const goodJob = (id, over = {}) => ({ job_id: id, objective: "refine console panel " + id, done_meaning: "panel refined", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/v8b/lrcq/frr/" + id + ".mjs"], forbidden_files: ["secrets", "PR#182"], test_commands: [["node", "verifiers/check-" + id + ".mjs"]], negative_test_commands: [], expected_output_paths: ["src/v8b/lrcq/frr/" + id + ".mjs"], required_evidence_files: [{ path: "evidence/frr/" + id + ".json", mode: "must_exist" }], max_changed_lines: 200, max_files: 3, builder_cost_cap_usd: 0.3, checker_cost_cap_usd: 0.1, checker_criteria: ["diff_within_allowed", "tests_executed"], gate_trigger: "NONE", rollback_action: "remove worktree + branch", ...over });
{ const p = resolveRunPlan(goodJob("j5"), "R1", manifest);
  ok("09 resolver derives lane/real-run-<run>-<job> branch", p.branch === "lane/real-run-R1-j5");
  ok("10 resolver derives worktree under permitted root", p.worktree === "/repo-worktrees/R1/j5"); }
ok("11 good executable job validates", validateExecutableJob(goodJob("j1"), manifest, { exists: () => true }).valid === true);
ok("12 absolute /wt worktree refused", validateExecutableJob(goodJob("j1", { worktree: "/wt/frr-0" }), manifest, { exists: () => true }).refusals.some((r) => /absolute \/wt/.test(r)));
ok("13 branch outside manifest prefix refused", validateExecutableJob(goodJob("j1", { branch: "lane/frr-0" }), manifest, { exists: () => true }).refusals.some((r) => /outside manifest prefix/.test(r)));
ok("14 path-string test refused (must be argv array)", validateExecutableJob(goodJob("j1", { test_commands: ["src/x.selftest.mjs"] }), manifest, { exists: () => true }).refusals.some((r) => /argv array/.test(r)));
ok("15 missing test target refused", validateExecutableJob(goodJob("j1"), manifest, { exists: () => false }).refusals.some((r) => /test target missing/.test(r)));
ok("16 expected output outside allowed_files refused", validateExecutableJob(goodJob("j1", { expected_output_paths: ["src/OTHER/z.mjs"] }), manifest, { exists: () => true }).refusals.some((r) => /outside allowed_files/.test(r)));
ok("17 builder-writable verifier/evidence refused (must be immutable)", validateExecutableJob(goodJob("j1", { required_evidence_files: [{ path: "src/v8b/lrcq/frr/j1.mjs", mode: "must_exist" }] }), manifest, { exists: () => true }).refusals.some((r) => /immutable to the builder/.test(r)));
ok("18 missing cost caps refused", validateExecutableJob(goodJob("j1", { builder_cost_cap_usd: undefined }), manifest, { exists: () => true }).refusals.some((r) => /builder_cost_cap/.test(r)));
ok("19 founder-gated job not auto-eligible", validateExecutableJob(goodJob("j1", { gate_trigger: "FOUNDER_GATE" }), manifest, { exists: () => true }).refusals.some((r) => /founder-gated/.test(r)));
// all-25
{ const jobs = Array.from({ length: 25 }, (_, i) => goodJob("j" + i)); const v = validateAll25({ jobs }, manifest, { exists: () => true });
  ok("20 all-25 executable jobs validate", v.valid === true && v.count === 25); }
{ const jobs = Array.from({ length: 25 }, (_, i) => goodJob("j" + i)); jobs[7] = goodJob("j7", { test_commands: ["bare-string"] }); const v = validateAll25({ jobs }, manifest, { exists: () => true });
  ok("21 all-25 fails if ANY job is invalid (not just the first)", v.valid === false && v.refusals.some((r) => /j7/.test(r))); }
{ const jobs = [goodJob("a", { dependencies: ["b"] }), goodJob("b", { dependencies: ["a"] })]; const v = validateAll25({ jobs }, manifest, { exists: () => true });
  ok("22 dependency cycle refused", v.refusals.some((r) => /cycle/.test(r))); }
{ const p1 = [resolveRunPlan(goodJob("a"), "R", manifest)]; ok("23 run-plan digest is stable + sha256", runPlanDigest(p1) === runPlanDigest(p1) && runPlanDigest(p1).startsWith("sha256:")); }

// ---- FG-LRCQ-ACT-010: the FROZEN executable backlog v2 validates all-25 against the real manifest ----
{ const { readFileSync } = await import("node:fs"); const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url"); const { resolve, dirname } = await import("node:path");
  const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const bl = JSON.parse(readFileSync(resolve(REPO, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
  const man = JSON.parse(readFileSync(resolve(REPO, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
  const exists = (t) => { try { execFileSync("test", ["-e", resolve(REPO, t)]); return true; } catch { return false; } };
  const v = validateAll25(bl, man, { exists });
  ok("24 FROZEN backlog v2 has exactly 25 jobs", (bl.jobs || []).length === 25);
  ok("25 FROZEN backlog v2 validates all-25 against the real manifest + immutable verifier", v.valid === true && v.count === 25);
  ok("26 FROZEN backlog v2 has NO incompatible schema (no lane/frr, no /wt, no bare-string tests)", !JSON.stringify(bl).match(/lane\/frr-|"\/wt\/|"tests":/) && (bl.jobs || []).every((j) => Array.isArray(j.test_commands[0])));
  ok("27 FROZEN backlog v2 is all-endurance-fixture (not product completion)", (bl.jobs || []).every((j) => j.classification === "ENDURANCE_FIXTURE")); }

console.log("\nLRCQ FULL-MATERIAL SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
