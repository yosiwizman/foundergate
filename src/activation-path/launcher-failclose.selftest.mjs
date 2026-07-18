// PAES-HANDOFF-HOTFIX-2 launcher fail-closed regression. Executes the REAL
// launcher (tools/terminal0/paes/start-wave2-session) in an isolated temp dir
// with STUBBED leaf-scripts, driving the post-qualification decision branch. The
// invariant under test: the launcher reports "running autonomously" / exits 0
// ONLY when consume-and-start succeeds AND handoff.json was written; otherwise it
// tears down the supervisor and fails closed, reporting the TRUE decision state
// (never a false "running" and never a false "unconsumed").
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_REPO = join(HERE, "..", "..");
const LAUNCHER = join(REAL_REPO, "tools", "terminal0", "paes", "start-wave2-session");
const SRC = readFileSync(LAUNCHER, "utf8");

// ---- source guards: the success path must require BOTH the consume RC and the
// handoff marker (regression against the unchecked-RC version that could report
// "running" while the supervisor stayed gated). ----
ok("01 launcher captures consume-and-start RC", /CONSUME_RC=\$\?/.test(SRC));
ok("02 success gated on RC==0 AND handoff.json present",
  /\[ "\$CONSUME_RC" = "0" \] && \[ -f "\$SUP\/handoff\.json" \]/.test(SRC));
ok("03 'running autonomously' only inside that guarded block (not unconditional)", (() => {
  const idx = SRC.indexOf('FounderGate is running autonomously');
  const guard = SRC.indexOf('[ "$CONSUME_RC" = "0" ] && [ -f "$SUP/handoff.json" ]');
  const exitZeroAfter = SRC.indexOf("exit 0", idx);
  return idx > guard && guard !== -1 && exitZeroAfter !== -1;
})());
ok("04 failure branch reports TRUE consumed state from disk", /CONSUMED_STATE=/.test(SRC) && /\.consumed===true/.test(SRC));

// ---- behavioral: run the real launcher with stubbed leaves (needs the real host
// to pass the Mac16,11 preflight; skip the run elsewhere but keep source guards). ----
const host = spawnSync("sysctl", ["-n", "hw.model"], { encoding: "utf8" }).stdout.trim();
const haveClaude = spawnSync("bash", ["-lc", "command -v claude"], { encoding: "utf8" }).status === 0;
if (host !== "Mac16,11" || !haveClaude) {
  console.log(`  skip behavioral run (host=${host||"?"}, claude=${haveClaude}) — source guards still enforced`);
  console.log(`\nLAUNCHER FAIL-CLOSED SELFTEST: ${n - fails.length}/${n} passed (behavioral skipped)`);
  process.exit(fails.length ? 1 : 0);
}

function scenario({ qualRc, consumeRc, writeHandoff }) {
  const td = mkdtempSync(join(tmpdir(), "launcher-fc-"));
  const bin = join(td, "bin"); mkdirSync(bin);          // SCRIPT_DIR (holds launcher + stubs)
  const repo = join(td, "repo");                        // fake $REPO = bin/../../..
  // SCRIPT_DIR is $bin; REPO is resolved as $bin/../../.. -> create that layout.
  const sup = join(repo, ".foundergate", "supervisor");
  const gov = join(repo, ".foundergate", "governance");
  const res = join(repo, ".foundergate", "gates", "resolutions");
  for (const d of [sup, gov, res, join(sup, "logs"), join(sup, "worker-results")]) mkdirSync(d, { recursive: true });
  // SCRIPT_DIR/../../.. must equal repo: place bin at repo/a/b/bin
  const scriptDir = join(repo, "a", "b", "paes"); mkdirSync(scriptDir, { recursive: true });
  // governance ACTIVE
  for (const f of ["durable_directive_control", "autonomous_repository_lifecycle", "autonomous_run_envelope", "gate_routing", "autonomy_policy_envelope"])
    writeFileSync(join(gov, f + ".json"), JSON.stringify({ status: "ACTIVE" }));
  writeFileSync(join(sup, "stop.json"), JSON.stringify({ panic_stop: false }));
  writeFileSync(join(res, "gate-test-paesact.json"), JSON.stringify({ selected_option: "ACTIVATE_SAFE_NARROW_ALLOWLIST", consumed: false }, null, 2));
  // launcher + stubs in scriptDir
  copyFileSync(LAUNCHER, join(scriptDir, "start-wave2-session"));
  const stub = (name, body) => { const p = join(scriptDir, name); writeFileSync(p, body); chmodSync(p, 0o755); };
  // Stubs are ESM (.mjs under a type:module repo) — use imports, never require().
  stub("supervisor-session", '#!/usr/bin/env node\nsetTimeout(()=>process.exit(0), 4000);\n');       // stays alive to be killed
  stub("singleton-check.mjs", '#!/usr/bin/env node\nconsole.log("free");\n');
  stub("recover-run.mjs", '#!/usr/bin/env node\nconsole.log("{\\"interrupted\\":false}");\n');
  stub("create-wave2-run.mjs", 'import {writeFileSync,rmSync} from "node:fs";const SUP=process.argv[2]+"/.foundergate/supervisor";const now=Math.floor(Date.now()/1000);writeFileSync(SUP+"/current-cycle.json",JSON.stringify({run_id:"t",deadline:now+9*3600}));try{rmSync(SUP+"/handoff.json",{force:true})}catch{}console.log("created");\n');
  stub("qualify-handoff.mjs", `#!/usr/bin/env node\nprocess.exit(${qualRc});\n`);
  // consume stub: optionally write handoff.json + set consumed, then exit consumeRc
  stub("consume-and-start.mjs", `import {writeFileSync,readdirSync,readFileSync} from "node:fs";const REPO=process.argv[2];const SUP=REPO+"/.foundergate/supervisor";\nif(${writeHandoff?"true":"false"}){writeFileSync(SUP+"/handoff.json",JSON.stringify({result:"SAFE_TO_LEAVE_UNATTENDED"}));\n  const rd=REPO+"/.foundergate/gates/resolutions";const g=readdirSync(rd)[0];const r=JSON.parse(readFileSync(rd+"/"+g));r.consumed=true;writeFileSync(rd+"/"+g,JSON.stringify(r));}\nprocess.exit(${consumeRc});\n`);
  stub("status-wave2-session", '#!/usr/bin/env bash\necho status\n');
  const r = spawnSync("bash", [join(scriptDir, "start-wave2-session")], { encoding: "utf8", timeout: 30000 });
  const consumed = (() => { try { const g = readdirSync(res)[0]; return JSON.parse(readFileSync(join(res, g))).consumed === true; } catch { return null; } })();
  const out = (r.stdout || "") + (r.stderr || "");
  const handoff = existsSync(join(sup, "handoff.json"));
  rmSync(td, { recursive: true, force: true });
  return { status: r.status, out, consumed, handoff };
}

// S1: happy path — qual ok, consume ok, handoff written -> running, exit 0, consumed
const s1 = scenario({ qualRc: 0, consumeRc: 0, writeHandoff: true });
ok("05 happy path reports running autonomously", /running autonomously/.test(s1.out));
ok("06 happy path exits 0", s1.status === 0);

// S2: THE BUG — qual ok but consume FAILS (e.g. expired), no handoff -> must NOT
// claim running; must fail closed; decision stays unconsumed.
const s2 = scenario({ qualRc: 0, consumeRc: 1, writeHandoff: false });
ok("07 consume-fail does NOT report running autonomously", !/running autonomously/.test(s2.out));
ok("08 consume-fail reports activation did not complete", /Activation did not complete/.test(s2.out));
ok("09 consume-fail exits non-zero (fail closed)", s2.status !== 0);
ok("10 consume-fail leaves decision UNCONSUMED", s2.consumed === false);
ok("11 consume-fail reports the true 'remains unconsumed' state", /remains unconsumed/.test(s2.out));

// S3: qualification fails -> stop, unconsumed, no running
const s3 = scenario({ qualRc: 1, consumeRc: 0, writeHandoff: true });
ok("12 qual-fail does NOT report running", !/running autonomously/.test(s3.out));
ok("13 qual-fail reports qualification failed", /qualification failed/.test(s3.out));
ok("14 qual-fail exits non-zero", s3.status !== 0);

// S4: consume returns 0 but handoff NOT written (partial/inconsistent) -> must
// still fail closed, never report running on a missing marker.
const s4 = scenario({ qualRc: 0, consumeRc: 0, writeHandoff: false });
ok("15 missing-handoff (rc0) does NOT report running", !/running autonomously/.test(s4.out));
ok("16 missing-handoff fails closed (non-zero)", s4.status !== 0);

console.log(`\nLAUNCHER FAIL-CLOSED SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
