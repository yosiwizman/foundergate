// Lane C selftest — Live Run Console view-model + install-Doctor.
// Proves: liveness-from-heartbeat-only, stale-while-running conflict surfacing,
// run-scoped event truth (no fake progress), pause/stop visibility, Doctor UNKNOWN
// honesty, determinism, frozen outputs.
import { buildConsoleView, buildDoctorChecklist, renderConsoleText, renderDoctorText, UNKNOWN } from "./run-console.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

console.log("== Lane C — Live Run Console + Doctor ==");

const HB_MS = 1784428534019;
const NOW = HB_MS + 30_000;
const EVENTS = [
  { evt: "start", run_id: "RUN-A" },
  { evt: "legacy" },                       // unscoped
  { evt: "work", run_id: "RUN-A" },
  { evt: "other", run_id: "RUN-B" },
];

// 01 — fresh hb + RUNNING -> LIVE, controls on, no conflict
(() => {
  const v = buildConsoleView({ runId: "RUN-A", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, events: EVENTS, nowMs: NOW });
  ok("01 fresh RUNNING -> LIVE, pause/stop on, no conflict", v.liveness === "LIVE" && v.pause_available === true && v.stop_available === true && v.liveness_conflict === null);
})();

// 02 — STALE heartbeat while RUNNING -> conflict surfaced, liveness NOT LIVE, controls off
(() => {
  const v = buildConsoleView({ runId: "RUN-A", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS - 500_000 }, events: EVENTS, nowMs: NOW });
  ok("02 stale-while-running -> conflict + not LIVE", v.liveness === "STALE" && v.liveness_conflict === "STALE_WHILE_RUNNING" && v.pause_available === false);
})();

// 03 — never claims LIVE with no heartbeat
(() => {
  const v = buildConsoleView({ runId: "RUN-A", state: { state: "RUNNING" }, events: EVENTS, nowMs: NOW });
  ok("03 no heartbeat -> NO HEARTBEAT, not LIVE, conflict surfaced", v.liveness === "NO HEARTBEAT" && v.liveness !== "LIVE" && v.liveness_conflict === "STALE_WHILE_RUNNING");
})();

// 04 — run-scoped events: only active run counted as current (no fake progress)
(() => {
  const v = buildConsoleView({ runId: "RUN-A", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, events: EVENTS, nowMs: NOW });
  ok("04 only active-run events current; legacy+other historical", v.current_event_count === 2 && v.legacy_unscoped_events === 1 && v.historical_event_count === 2);
})();

// 05 — no run id -> nothing counted current (fail closed)
(() => {
  const v = buildConsoleView({ state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, events: EVENTS, nowMs: NOW });
  ok("05 no runId -> run_id UNKNOWN, current=0", v.run_id === UNKNOWN && v.current_event_count === 0);
})();

// 06 — final lifecycle -> controls OFF even if a heartbeat exists
(() => {
  const v = buildConsoleView({ runId: "RUN-A", state: { state: "STOPPED_EXHAUSTED" }, heartbeat: { ts: HB_MS }, events: EVENTS, nowMs: NOW });
  ok("06 final run -> pause/stop off, is_final true", v.is_final === true && v.pause_available === false && v.stop_available === false);
})();

// 07 — DRAINING stale -> conflict names DRAINING
(() => {
  const v = buildConsoleView({ runId: "RUN-A", state: { state: "DRAINING" }, heartbeat: { ts: HB_MS - 500_000 }, events: EVENTS, nowMs: NOW });
  ok("07 stale-while-draining conflict", v.liveness_conflict === "STALE_WHILE_DRAINING");
})();

// 08 — view is frozen
ok("08 view frozen", Object.isFrozen(buildConsoleView({ runId: "RUN-A", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, events: EVENTS, nowMs: NOW })));

// 09 — deterministic render
(() => {
  const args = { runId: "RUN-A", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, events: EVENTS, nowMs: NOW };
  ok("09 console render deterministic", renderConsoleText(buildConsoleView(args)) === renderConsoleText(buildConsoleView(args)));
})();

// --- Install Doctor ---
// 10 — all present -> READY
ok("10 doctor all present -> READY", buildDoctorChecklist({ git: true, gh: true, node: true, npm: true, zip: true, unzip: true, shasum: true, python3: true }).overall === "READY");

// 11 — a MISSING tool -> NOT_READY (and that item MISSING)
(() => {
  const d = buildDoctorChecklist({ git: true, gh: false, node: true, npm: true, zip: true, unzip: true, shasum: true, python3: true });
  ok("11 missing tool -> NOT_READY", d.overall === "NOT_READY" && d.items.find((i) => i.name === "gh").status === "MISSING");
})();

// 12 — an UNOBSERVED (undefined) tool -> UNKNOWN, NEVER invented PASS; overall UNKNOWN
(() => {
  const d = buildDoctorChecklist({ git: true, gh: true, node: true, npm: true, zip: true, unzip: true, shasum: true /* python3 undefined */ });
  const py = d.items.find((i) => i.name === "python3");
  ok("12 unobserved tool -> UNKNOWN (never PASS), overall UNKNOWN", py.status === UNKNOWN && py.status !== "PASS" && d.overall === UNKNOWN);
})();

// 13 — UNKNOWN dominates even if a MISSING also present (fail honest, not falsely READY)
(() => {
  const d = buildDoctorChecklist({ git: false /* rest undefined */ });
  ok("13 unknowns present -> overall UNKNOWN (not READY)", d.overall === UNKNOWN && d.overall !== "READY");
})();

// 14 — doctor output + items frozen
(() => { const d = buildDoctorChecklist({ git: true }); ok("14 doctor + items frozen", Object.isFrozen(d) && Object.isFrozen(d.items) && Object.isFrozen(d.items[0])); })();

// 15 — doctor render deterministic + shows honest statuses
(() => {
  const d = buildDoctorChecklist({ git: true, gh: false });
  const txt = renderDoctorText(d);
  ok("15 doctor render honest + deterministic", txt === renderDoctorText(d) && txt.includes("[PASS] git") && txt.includes("[MISSING] gh") && txt.includes("[UNKNOWN] node"));
})();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nLANE-C-RUN-CONSOLE-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
