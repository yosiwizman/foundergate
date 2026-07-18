// VB2 RERUN — ENHANCED INDEPENDENT SENTINEL. Runs alongside the driver; read-only observer.
// Records per tick (>=300s): driver/soak/caffeinate PID state, PreventSystemSleep, full-sleep count,
// new sleep events, lease state, observed HEAD (worktree), eligibility, intervention. Named
// "sentinel-watch" so the driver's SECOND_SOAK signature never matches it. Exits when driver gone.
import { execSync } from "node:child_process";
import { appendFileSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const DRIVER_PID = Number(process.argv[2]);
const WT = process.argv[3];
const LEASE_ROOT = process.argv[4]; // ~/.cldh/host-workload-lease
const SHA = "b9af1def60009ac9dae69bf519b5e0a2680d4600";
const STATE = resolve(HERE, "soak-8h.json");
const OUT = resolve(HERE, "sentinel-oversight.jsonl");
const FINAL = resolve(HERE, "sentinel-final.json");
const TICK_MS = 300_000;
const sh = (c) => { try { return execSync(c, { encoding: "utf8" }); } catch (e) { return (e.stdout || "") + (e.stderr || ""); } };
const alive = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch { return false; } };
const countSleeps = () => (sh("pmset -g log 2>/dev/null").match(/\bSleep\s{2,}\tEntering Sleep state/g) || []).length;
const pgrep1 = (pat) => { const o = sh(`pgrep -f ${JSON.stringify(pat)}`).trim().split("\n").filter(Boolean); return o.length ? Number(o[0]) : null; };
const observedHead = () => { try { return execSync(`git -C "${WT}" rev-parse HEAD`, { encoding: "utf8" }).trim(); } catch { return "UNKNOWN"; } };
const leaseState = () => { try { const j = JSON.parse(readFileSync(join(LEASE_ROOT, "lease.json"), "utf8")); return { status: j.status, run_id: j.run_id }; } catch { return { status: "UNKNOWN" }; } };
const readState = () => { try { const j = JSON.parse(readFileSync(STATE, "utf8")); const w = j.windows || []; return { windows: w.length, ok: w.reduce((n, x) => n + (x.ok || 0), 0), fail: w.reduce((n, x) => n + (x.fail || 0), 0) }; } catch { return null; } };
const pss = () => { const a = sh("pmset -g assertions 2>/dev/null"); return { PreventSystemSleep: /PreventSystemSleep\s+1/.test(a), onBehalfOfDriver: new RegExp(`on behalf of 'node' \\(pid ${DRIVER_PID}\\)`).test(a) }; };

const baseline = countSleeps();
writeFileSync(OUT, JSON.stringify({ sentinel: "start", at: new Date().toISOString(), driver_pid: DRIVER_PID, worktree: WT, expected_head: SHA, baseline_full_sleep_count: baseline, tick_seconds: TICK_MS / 1000 }) + "\n");
let ticks = 0, maxNewSleep = 0, headDrift = false, caffLost = 0;
async function tick() {
  ticks++;
  const soakPid = pgrep1("soak-run.mjs");
  const caffPid = pgrep1("caffeinate -dimsu");
  const c = pss();
  const sleeps = countSleeps();
  const head = observedHead();
  const newSleep = sleeps - baseline;
  if (newSleep > maxNewSleep) maxNewSleep = newSleep;
  if (head !== SHA) headDrift = true;
  if (!c.PreventSystemSleep) caffLost++;
  const line = {
    sentinel: "tick", n: ticks, at: new Date().toISOString(),
    driver_alive: alive(DRIVER_PID), soak_pid: soakPid, soak_alive: alive(soakPid),
    caffeinate_pid: caffPid, caffeinate_alive: alive(caffPid),
    PreventSystemSleep: c.PreventSystemSleep, caffeinate_on_behalf_of_driver: c.onBehalfOfDriver,
    full_sleep_count: sleeps, new_system_sleep_since_baseline: newSleep,
    lease: leaseState(), observed_head: head, head_equals_sha: head === SHA,
    soak_state: readState(), intervention: null,
  };
  if (newSleep > 0) line.intervention = "SYSTEM_SLEEP_DETECTED — permanent QUIET_HOST failure";
  if (!c.PreventSystemSleep) line.intervention = (line.intervention ? line.intervention + "; " : "") + "PreventSystemSleep NOT held";
  if (head !== SHA) line.intervention = (line.intervention ? line.intervention + "; " : "") + "OBSERVED HEAD != evaluated SHA";
  appendFileSync(OUT, JSON.stringify(line) + "\n");
  // 5-min recovery-state heartbeat: refresh updated_at + running_ticks atomically, keep state RUNNING, no history bloat.
  try {
    const rsPath = resolve(HERE, "RUN_RECOVERY_STATE.json");
    if (existsSync(rsPath)) {
      const rs = JSON.parse(readFileSync(rsPath, "utf8"));
      if (rs.state === "RUNNING") {
        rs.updated_at = new Date().toISOString();
        rs.running_ticks = ticks;
        rs.last_sentinel_head = head;
        rs.last_new_system_sleep = newSleep;
        const tmp = rsPath + ".tmp";
        writeFileSync(tmp, JSON.stringify(rs, null, 2));
        (await import("node:fs")).renameSync(tmp, rsPath);
      }
    }
  } catch (e) { /* best-effort heartbeat */ }
  if (!alive(DRIVER_PID)) {
    const fin = { sentinel: "final", at: new Date().toISOString(), total_ticks: ticks, max_new_system_sleep: maxNewSleep, ticks_without_PreventSystemSleep: caffLost, head_ever_drifted: headDrift, driver_gone: true };
    appendFileSync(OUT, JSON.stringify({ sentinel: "stop", at: new Date().toISOString(), reason: "driver pid gone", total_ticks: ticks }) + "\n");
    writeFileSync(FINAL, JSON.stringify(fin, null, 2));
    process.exit(0);
  }
  setTimeout(tick, TICK_MS);
}
setTimeout(tick, TICK_MS);
