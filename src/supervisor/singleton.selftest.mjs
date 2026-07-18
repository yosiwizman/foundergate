// PAES singleton self-test — proves duplicate/racing supervisors cannot start
// (regression for the overlapping-supervisor activity observed in prior qual).
import { isHealthy, evaluateAcquire, acquireSingleton, releaseSingleton } from "./singleton.mjs";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
const now = 1000;

// isHealthy
ok("01 alive + fresh heartbeat = healthy", isHealthy({ last_heartbeat: now - 10 }, { pid_alive: true, now, stale_interval: 120 }) === true);
ok("02 dead process = not healthy", isHealthy({ last_heartbeat: now - 10 }, { pid_alive: false, now, stale_interval: 120 }) === true ? false : true);
ok("03 stale heartbeat = not healthy", isHealthy({ last_heartbeat: now - 300 }, { pid_alive: true, now, stale_interval: 120 }) === false);
ok("04 null lock = not healthy", isHealthy(null, { pid_alive: true, now }) === false);

// evaluateAcquire
ok("05 no existing -> acquire", evaluateAcquire(null, {}, { now }).action === "acquire");
ok("06 healthy existing -> reject (no duplicate)", evaluateAcquire({ pid: 5, last_heartbeat: now }, { pid: 6 }, { pid_alive: true, now, stale_interval: 120 }).action === "reject");
ok("07 stale existing -> recover", evaluateAcquire({ pid: 5, last_heartbeat: now - 999, run_id: "A" }, { pid: 6, run_id: "B" }, { pid_alive: false, now, stale_interval: 120 }).action === "recover");
ok("08 same run_id+nonce replay -> reject (racing launcher)", evaluateAcquire({ pid: 5, last_heartbeat: now - 999, run_id: "A", nonce: "z" }, { pid: 6, run_id: "A", nonce: "z" }, { pid_alive: false, now, stale_interval: 120 }).action === "reject");

// acquireSingleton (real fs, atomic O_EXCL)
const tmp = mkdtempSync(join(tmpdir(), "sing-"));
const lp = join(tmp, "singleton.lock");
const a1 = acquireSingleton(lp, { pid: 100, run_id: "R1", exact_sha: "s", nonce: "n1", deadline: now + 9 * 3600 }, { now });
ok("09 first acquire succeeds + writes lock", a1.acquired === true && existsSync(lp));
// second launcher, existing healthy (pid alive, fresh) -> rejected
const a2 = acquireSingleton(lp, { pid: 200, run_id: "R2", nonce: "n2" }, { now: now + 5, pid_alive: true, stale_interval: 120 });
ok("10 duplicate supervisor rejected while healthy", a2.acquired === false && a2.decision.reason.includes("healthy"));
// stale (dead pid) -> recover + acquire
const a3 = acquireSingleton(lp, { pid: 300, run_id: "R3", exact_sha: "s2", nonce: "n3", deadline: now + 9 * 3600 }, { now: now + 500, pid_alive: false, stale_interval: 120 });
ok("11 stale supervisor recovered + new acquire", a3.acquired === true && a3.recovered === 100);
// mismatched-sha stale reuse still recovers to a fresh lock bound to new sha
ok("12 recovered lock bound to new pid+sha", a3.lock.pid === 300 && a3.lock.exact_sha === "s2");
// release
ok("13 non-owner cannot release", releaseSingleton(lp, 999).released === false);
ok("14 owner releases", releaseSingleton(lp, 300).released === true && !existsSync(lp));

// no-credential invariant on the lock content
const a4 = acquireSingleton(lp, { pid: 400, run_id: "R4", exact_sha: "s", nonce: "n4", deadline: now }, { now });
const content = JSON.stringify(a4.lock);
ok("15 lock file carries no credential material", !/ghp_|sk-|oauth|token|ANTHROPIC|password|secret/i.test(content));

// ---- WIRING guards (regression for PAES-STARTER-CHECKER F1/F2): the singleton
// must be actually CALLED on the live path, and the launcher must tear down the
// supervisor on qualification failure. ----
import { readFileSync as rf } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join as pj } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));
const supSession = rf(pj(HERE, "../../tools/terminal0/paes/supervisor-session"), "utf8");
const starter = rf(pj(HERE, "../../tools/terminal0/paes/start-wave2-session"), "utf8");
ok("16 supervisor-session actually calls acquireSingleton (wired, not dead code)", /acquireSingleton\(/.test(supSession));
ok("17 supervisor-session exits when singleton not acquired", /!acq\.acquired/.test(supSession) && /process\.exit\(0\)/.test(supSession));
ok("18 supervisor-session refreshes lock heartbeat", /last_heartbeat = nowS\(\)/.test(supSession));
ok("19 supervisor-session releases lock on exit", /releaseSingleton\(/.test(supSession) && /process\.on\("exit"/.test(supSession));
ok("20 launcher tears down supervisor on qualification failure", /kill "\$SUP_PID"/.test(starter) && /panic_stop":true/.test(starter));
ok("21 launcher does NOT consume decision on failure path", starter.indexOf("consume-and-start") < starter.indexOf("Live handoff qualification failed"));

rmSync(tmp, { recursive: true, force: true });
console.log(`\nPAES SINGLETON SELFTEST: ${n - fails.length}/${n} passed`);
if (fails.length) { console.log("FAILED:", fails.join(", ")); process.exit(1); }
process.exit(0);
