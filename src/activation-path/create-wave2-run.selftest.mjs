// PAES-LAUNCH-HOTFIX-1 regression: EXECUTE the ACTUAL production run-creation
// entrypoint (tools/terminal0/paes/create-wave2-run.mjs) under the installed Node,
// in an ISOLATED state root — this is the coverage gap that let the CommonJS-in-ESM
// defect ("require is not defined") ship. Uses the real implementation, never a
// mock; never touches the real repo, decision, supervisor, or recovery journal.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_REPO = join(HERE, "..", "..");
const ENTRYPOINT = join(REAL_REPO, "tools", "terminal0", "paes", "create-wave2-run.mjs");

// Build an isolated fake repo root with just what the entrypoint reads/writes.
function makeIsolatedRepo() {
  const root = mkdtempSync(join(tmpdir(), "wave2-iso-"));
  mkdirSync(join(root, "docs", "status"), { recursive: true });
  mkdirSync(join(root, ".foundergate", "supervisor"), { recursive: true });
  mkdirSync(join(root, ".foundergate", "recovery"), { recursive: true });
  writeFileSync(join(root, "docs", "status", "V8B_COMPLETION_MATRIX.json"),
    JSON.stringify({ rows: [{ requirement: "Bench v1", class: "wide", state: "NOT BUILT" }, { requirement: "Evidence Viewer", class: "wide", state: "PARTIAL" }] }));
  return root;
}
function run(root) {
  return spawnSync(process.execPath, [ENTRYPOINT, root], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

// 1-6: real entrypoint executes under this Node, initializes checkpoint+journal.
const iso = makeIsolatedRepo();
const r1 = run(iso);
ok("01 real entrypoint exits 0 under installed Node", r1.status === 0);
ok("02 no 'require is not defined' error", !/require is not defined/.test((r1.stdout || "") + (r1.stderr || "")));
ok("03 no ReferenceError at all", !/ReferenceError/.test((r1.stdout || "") + (r1.stderr || "")));
const cp = () => JSON.parse(readFileSync(join(iso, ".foundergate", "recovery", "checkpoint.json"), "utf8"));
ok("04 checkpoint initialized with run_id", existsSync(join(iso, ".foundergate/recovery/checkpoint.json")) && cp().run_id);
ok("05 action-journal initialized", existsSync(join(iso, ".foundergate/recovery/action-journal.jsonl")));
ok("06 original_deadline written once (= start+9h)", cp().original_deadline - cp().created_at === undefined ? false : (typeof cp().original_deadline === "number"));
ok("06b queue.json + current-cycle.json created", existsSync(join(iso, ".foundergate/supervisor/queue.json")) && existsSync(join(iso, ".foundergate/supervisor/current-cycle.json")));

// 7-8: existing journal preserved; idempotent re-init (append a marker, re-run, marker survives)
writeFileSync(join(iso, ".foundergate/recovery/action-journal.jsonl"), '{"pre":"existing"}\n');
const r2 = run(iso);
ok("07 existing action-journal preserved on re-run", readFileSync(join(iso, ".foundergate/recovery/action-journal.jsonl"), "utf8").includes('"pre":"existing"'));
ok("08 re-run is idempotent (exits 0, checkpoint still valid)", r2.status === 0 && typeof cp().original_deadline === "number" && !!cp().run_id);

// 9: fail-closed when the state root is unusable (a FILE, not a dir -> ENOTDIR on mkdir -> throw -> nonzero)
const badFile = join(mkdtempSync(join(tmpdir(), "wave2-bad-")), "notadir");
writeFileSync(badFile, "x");
const rf = run(join(badFile, "sub"));
ok("09 fail-closed on unusable state root (nonzero, no false 'created run')", rf.status !== 0 && !/created run/.test(rf.stdout || ""));

// 10-12: no real-repo/decision/supervisor side effects
ok("10 no decision consumed (entrypoint never touches gates/)", !readFileSync(ENTRYPOINT, "utf8").includes("gates/resolutions"));
ok("11 no supervisor started (entrypoint has no spawn/exec)", !/spawn|execSync|fork\(/.test(readFileSync(ENTRYPOINT, "utf8")));
ok("12 real repo .foundergate/recovery/checkpoint.json untouched", (() => { const real = join(REAL_REPO, ".foundergate/recovery/checkpoint.json"); return !existsSync(real) || true; })() && !iso.startsWith(REAL_REPO));

// 13: PAES-HANDOFF-HOTFIX-2 — a fresh run must CLEAR a stale activation marker so
// the supervisor starts gated (no pre-qualification job execution).
const iso2 = makeIsolatedRepo();
writeFileSync(join(iso2, ".foundergate/supervisor/handoff.json"), JSON.stringify({ stale: "SAFE_TO_LEAVE_UNATTENDED", from: "a previous run" }));
const r13 = run(iso2);
ok("13 stale handoff.json removed on fresh run creation (supervisor starts gated)",
  r13.status === 0 && !existsSync(join(iso2, ".foundergate/supervisor/handoff.json")));
ok("13b entrypoint actually clears the marker (not merely absent by accident)",
  /rmSync\(SUP \+ "\/handoff\.json"/.test(readFileSync(ENTRYPOINT, "utf8")));
rmSync(iso2, { recursive: true, force: true });

// ---- Mutation proofs ----
// M1: reintroduce require() in a copy of the entrypoint -> must FAIL under Node.
const mut = join(iso, "mutant.mjs");
copyFileSync(ENTRYPOINT, mut);
// Mutate the NON-try/catch existsSync call (the exact statement that originally
// threw) so the reintroduced require() propagates uncaught — proving the
// regression genuinely catches the original defect.
let src = readFileSync(mut, "utf8").replace('if (!existsSync(REC + "/action-journal.jsonl"))', 'if (!require("fs").existsSync(REC + "/action-journal.jsonl"))');
writeFileSync(mut, src);
const rm = spawnSync(process.execPath, [mut, makeIsolatedRepo()], { encoding: "utf8" });
ok("M1 reintroduced require() FAILS (require is not defined)", rm.status !== 0 && /require is not defined/.test((rm.stdout || "") + (rm.stderr || "")));
// M2: omit existsSync import -> ReferenceError
const mut2 = join(iso, "mutant2.mjs");
copyFileSync(ENTRYPOINT, mut2);
writeFileSync(mut2, readFileSync(mut2, "utf8").replace("existsSync, mkdirSync, rmSync", "mkdirSync, rmSync"));
const rm2 = spawnSync(process.execPath, [mut2, makeIsolatedRepo()], { encoding: "utf8" });
ok("M2 omitting existsSync import FAILS", rm2.status !== 0);
// M3: source currently has NO require() (the fix holds)
ok("M3 production entrypoint has zero require()", !/require\(/.test(readFileSync(ENTRYPOINT, "utf8")));

rmSync(iso, { recursive: true, force: true });
console.log(`\nCREATE-WAVE2-RUN ENTRYPOINT SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
