// VB2 INTEGRATED SOAK — INDEPENDENT SENTINEL WATCHER (SD-1 oversight cross-check).
//
// Runs ALONGSIDE the soak driver as an independent observer. It does NOT touch the lease, the store,
// or the driver; it only SAMPLES and APPENDS one JSON line per tick to sentinel-oversight.jsonl.
// Named "sentinel-watch" (NOT *soak-run/soak-driver/reliability-soak*) so the driver's own
// scanHostRows SECOND_SOAK signature never matches it, and it does no heavy work, so it is never a
// foreign-heavy violation.
//
// Each tick records: driver liveness, caffeinate PreventSystemSleep held (independent pmset read),
// any NEW full-Sleep event since baseline (a system sleep = permanent §5.1 downgrade), and the
// driver's current soak span/availability/samples. Exits when the driver pid is gone.

import { execSync } from "node:child_process";
import { appendFileSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRIVER_PID = Number(process.argv[2]);
const STATE = resolve(HERE, "soak-8h.json");
const OUT = resolve(HERE, "sentinel-oversight.jsonl");
const TICK_MS = 300_000; // 5 minutes

const sh = (c) => { try { return execSync(c, { encoding: "utf8" }); } catch (e) { return (e.stdout || "") + (e.stderr || ""); } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const countSleeps = () => {
  const log = sh("pmset -g log 2>/dev/null");
  // full-Sleep entries look like: "<ts>  Sleep               \tEntering Sleep state ..."
  return (log.match(/\bSleep\s{2,}\tEntering Sleep state/g) || []).length;
};
const psHasHeavyCaffeineFor = (pid) => {
  const a = sh("pmset -g assertions 2>/dev/null");
  const held = /PreventSystemSleep\s+1/.test(a);
  const onBehalf = new RegExp(`asserting on behalf of 'node' \\(pid ${pid}\\)`).test(a) || new RegExp(`on behalf of .*${pid}`).test(a);
  return { PreventSystemSleep: held, onBehalfOfDriver: onBehalf };
};
const readState = () => { try { return JSON.parse(readFileSync(STATE, "utf8")); } catch { return null; } };

const baselineSleeps = countSleeps();
writeFileSync(OUT, JSON.stringify({
  sentinel: "start", at: new Date().toISOString(), driver_pid: DRIVER_PID,
  baseline_full_sleep_count: baselineSleeps, tick_seconds: TICK_MS / 1000,
}) + "\n");

let ticks = 0;
function tick() {
  ticks++;
  const drvAlive = alive(DRIVER_PID);
  const caff = psHasHeavyCaffeineFor(DRIVER_PID);
  const sleeps = countSleeps();
  const st = readState();
  const stSummary = st ? {
    windows: Array.isArray(st.windows) ? st.windows.length : null,
    ok: st.windows ? st.windows.reduce((n, w) => n + (w.ok || 0), 0) : null,
    fail: st.windows ? st.windows.reduce((n, w) => n + (w.fail || 0), 0) : null,
  } : null;
  const line = {
    sentinel: "tick", n: ticks, at: new Date().toISOString(),
    driver_alive: drvAlive,
    caffeinate_PreventSystemSleep: caff.PreventSystemSleep,
    caffeinate_on_behalf_of_driver: caff.onBehalfOfDriver,
    new_system_sleep_since_baseline: sleeps - baselineSleeps,
    sleep_count_now: sleeps,
    soak_state: stSummary,
  };
  if (sleeps > baselineSleeps) line.ALERT = "SYSTEM SLEEP DETECTED DURING RUN — permanent §5.1 QUIET_HOST downgrade";
  if (!caff.PreventSystemSleep) line.ALERT = (line.ALERT ? line.ALERT + "; " : "") + "caffeinate PreventSystemSleep NO LONGER held";
  appendFileSync(OUT, JSON.stringify(line) + "\n");

  if (!drvAlive) {
    appendFileSync(OUT, JSON.stringify({ sentinel: "stop", at: new Date().toISOString(), reason: "driver pid gone", total_ticks: ticks }) + "\n");
    process.exit(0);
  }
  setTimeout(tick, TICK_MS);
}
setTimeout(tick, TICK_MS);
