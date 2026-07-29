// Lane A selftest — Founder Dashboard truthful status cards.
// Proves: no-invented-state, liveness-from-heartbeat-only, UNKNOWN honesty,
// determinism, output freezing, display escaping.
import { buildRunStatusCard, buildCards, renderCardsText, escapeText, UNKNOWN } from "./status-cards.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };

console.log("== Lane A — Founder Dashboard status cards ==");

const HB_MS = 1784428534019;
const NOW = HB_MS + 30_000;

// 01 — fresh heartbeat + running state -> LIVE with real age
(() => {
  const c = buildRunStatusCard({ runId: "run-1", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW });
  ok("01 fresh hb + RUNNING -> LIVE with real positive age", c.liveness === "LIVE" && c.heartbeat_age_seconds === 30 && c.lifecycle_display === "RUNNING");
})();

// 02 — NO invented state: missing heartbeat + missing state -> UNKNOWN, never LIVE, never a number
(() => {
  const c = buildRunStatusCard({ runId: "run-1", nowMs: NOW });
  ok("02 missing hb+state -> lifecycle UNKNOWN, liveness NO HEARTBEAT, age null", c.lifecycle_display === "UNKNOWN" && c.liveness === "NO HEARTBEAT" && c.heartbeat_age_seconds === null);
  ok("03 never claims LIVE without a heartbeat", c.liveness !== "LIVE");
  ok("04 never fabricates a numeric age", c.heartbeat_age_seconds === null);
})();

// 05 — stale heartbeat -> STALE, not LIVE, even if lifecycle says RUNNING
(() => {
  const c = buildRunStatusCard({ runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS - 500_000 }, nowMs: NOW });
  ok("05 stale hb -> liveness STALE (not LIVE)", c.liveness === "STALE" && c.liveness !== "LIVE");
})();

// 06 — missing runId -> UNKNOWN, never blank/invented
ok("06 missing runId -> UNKNOWN", buildRunStatusCard({ state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW }).run_id === UNKNOWN);

// 07 — handoff success is HISTORICAL, never shown as the lifecycle
(() => {
  const c = buildRunStatusCard({ runId: "r", state: { state: "STOPPED_EXHAUSTED" }, handoff: { result: "SAFE_TO_LEAVE_UNATTENDED" }, heartbeat: { ts: HB_MS }, nowMs: NOW });
  ok("07 handoff result is historical, lifecycle from state.json", c.lifecycle_display === "COMPLETED (queue exhausted)" && c.historical_launch_evidence === "SAFE_TO_LEAVE_UNATTENDED" && c.lifecycle_display !== "SAFE_TO_LEAVE_UNATTENDED");
})();

// 08 — no trusted clock -> age withheld as UNKNOWN, never guessed
(() => {
  const c = buildRunStatusCard({ runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS } });
  ok("08 no nowMs -> liveness UNKNOWN, age null (withheld)", c.liveness === UNKNOWN && c.heartbeat_age_seconds === null);
})();

// 09 — invented_state flag is always false (pass-through only)
ok("09 invented_state is false", buildRunStatusCard({ runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW }).invented_state === false);

// 10 — output card is frozen (caller cannot mutate dashboard truth)
(() => {
  const c = buildRunStatusCard({ runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW });
  let threw = false; try { c.liveness = "LIVE-FAKE"; } catch { threw = true; }
  ok("10 card is frozen (mutation blocked or ignored)", Object.isFrozen(c) && c.liveness === "LIVE");
})();

// 11 — buildCards returns a frozen array
(() => { const cards = buildCards({ runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW }); ok("11 buildCards frozen array", Object.isFrozen(cards) && cards.length === 1); })();

// 12 — render is DETERMINISTIC: same input -> byte-identical output
(() => {
  const snap = { runId: "r", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW };
  ok("12 render deterministic", renderCardsText(buildCards(snap)) === renderCardsText(buildCards(snap)));
})();

// 13 — render escapes content (display only, cannot inject markup)
(() => {
  const c = buildRunStatusCard({ runId: "<script>x</script>", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, nowMs: NOW });
  const txt = renderCardsText([c]);
  ok("13 render escapes injected markup", txt.includes("&lt;script&gt;") && !txt.includes("<script>"));
})();

// 14 — escapeText handles null/undefined without throwing
ok("14 escapeText null-safe", escapeText(null) === "" && escapeText(undefined) === "");

// 15 — empty cards render header only, no invented rows
ok("15 empty cards -> header only", renderCardsText([]).split("\n").length === 1);

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nLANE-A-STATUS-CARDS-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
