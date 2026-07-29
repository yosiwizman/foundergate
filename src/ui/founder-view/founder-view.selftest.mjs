// Integration-glue selftest — founder view composes command-center (#202) + status-cards (#201).
import { buildFounderView, renderFounderView, UNKNOWN } from "./founder-view.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log(`  FAIL ${name}`); } else console.log(`  ok   ${name}`); };
console.log("== Integration glue — founder view (#201 detail + #202 summary) ==");

const HB_MS = 1784428534019, NOW = HB_MS + 30_000;
const snap = { runId: "run-x", state: { state: "RUNNING" }, heartbeat: { ts: HB_MS }, evidence: [{ label: "pack", ts: Math.floor(NOW/1000) - 100 }], nowMs: NOW };

// 01 composes both: summary + detail present
(() => { const v = buildFounderView(snap); ok("01 composes summary + detail", v.summary && v.detail_cards && v.summary.title === "Founder Command Center"); })();
// 02 relationship declared complementary (not duplicate)
ok("02 complementary relationship", buildFounderView(snap).relationship === "complementary");
// 03 primary is command-center, detail is status-cards (visible path settled)
(() => { const v = buildFounderView(snap); ok("03 primary=command-center detail=status-cards", v.primary === "command-center" && v.detail === "status-cards" && /command-center.*status-cards/.test(v.visible_path)); })();
// 04 headline surfaces liveness + evidence freshness truthfully
(() => { const v = buildFounderView(snap); ok("04 headline LIVE + FRESH", v.headline.liveness === "LIVE" && v.headline.evidence_freshness === "FRESH"); })();
// 05 no-invented-state propagates: no heartbeat -> not LIVE
(() => { const v = buildFounderView({ runId: "r", state: { state: "RUNNING" }, nowMs: NOW }); ok("05 no hb -> not LIVE", v.headline.liveness !== "LIVE" && v.headline.liveness === "NO HEARTBEAT"); })();
// 06 missing runId -> UNKNOWN through the whole view
ok("06 missing runId -> UNKNOWN", buildFounderView({ nowMs: NOW }).run_id === UNKNOWN);
// 07 frozen
(() => { const v = buildFounderView(snap); ok("07 frozen", Object.isFrozen(v) && Object.isFrozen(v.headline)); })();
// 08 deterministic render
ok("08 deterministic render", renderFounderView(buildFounderView(snap)) === renderFounderView(buildFounderView(snap)));
// 09 render contains both summary + detail sections
(() => { const t = renderFounderView(buildFounderView(snap)); ok("09 render has summary+detail", t.includes("summary (command center)") && t.includes("detail (status cards)") && t.includes("[HEADLINE]")); })();

console.log(fails.length ? `\nRED: ${fails.length}/${n} failed` : `\nFOUNDER-VIEW-GLUE-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length ? 1 : 0);
