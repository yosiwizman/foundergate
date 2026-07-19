// FounderGate V8-B VB2 — UNIFIED LANE ROUTER proof: two dialects reconcile into one honest
// destination taxonomy, unknowns fail CLOSED to the founder (never to the backend), the
// routing composes the FROZEN gate-router law, and the surface has grown NO act edge.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GATE_TYPES, classifyGate } from "../gate-router/gate-router.mjs";
import { REDACTED } from "./cto-queue.mjs";
import * as router from "./lane-router.mjs";
import {
  SOURCES, DESTINATIONS, ROUTER_VERSION, LaneRouterError,
  normalizeUnit, routeQueues, routingDigest,
  renderDigestText, renderRoutedText, renderDigestHtml, renderRoutedHtml,
  renderSurfaceHtml, renderSurfaceText,
} from "./lane-router.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
const sourceOf = (name) => readFileSync(join(HERE, name), "utf8");

// destinationOf(rawUnit, source) — route a single unit and return only its destination.
const destOf = (raw, src) => normalizeUnit(raw, src).destination;

// A representative mixed pair of snapshots: ARLC lifecycle lanes + ARE run lanes, spanning
// every destination. All state is DATA the caller supplies — never invented by the router.
function seeded() {
  return {
    arlc: {
      lanes: [
        { lane_id: "arlc-ready", title: "Merge qualified PR", state: "READY", data_class: "PUBLIC" },
        { lane_id: "arlc-gate", title: "Adopt default provider", state: "READY", founder_gate_required: true, data_class: "PUBLIC" },
        { lane_id: "arlc-closed", title: "Superseded PR", state: "CLOSED", data_class: "PUBLIC" },
      ],
    },
    are: {
      items: [
        { run_id: "are-run", title: "Nightshift run", state: "RUNNING", data_class: "PUBLIC" },
        { run_id: "are-founder", title: "Public release", state: "TRUE_FOUNDER_GATE", data_class: "PUBLIC" },
        { run_id: "are-expert", title: "License question", state: "HUMAN_EXPERT_GATE", data_class: "PUBLIC" },
        { run_id: "are-blocked", title: "Stuck lane", state: "BLOCKED", data_class: "PUBLIC" },
        { run_id: "are-hold", title: "Checker findings", state: "CHECKER_FINDINGS", data_class: "PUBLIC" },
        { run_id: "are-pass", title: "Recorded pass", state: "PASS", data_class: "PUBLIC" },
      ],
    },
  };
}

console.log("== VB2 lane router — unified ARLC/ARE routing ==");

check("routingDigest counts the empty pair as all-zero, every source & destination bucket present (honest)", () => {
  const d = routingDigest({});
  assert.equal(d.total, 0);
  assert.equal(d.needs_human, 0);
  assert.equal(d.protected, 0);
  for (const s of [...SOURCES, "UNKNOWN"]) assert.equal(d.by_source[s], 0, `source ${s} must be present and 0`);
  for (const dest of DESTINATIONS) assert.equal(d.by_destination[dest], 0, `destination ${dest} must be present and 0`);
});

check("UNIFIED counting spans BOTH queues; by_source and by_destination each sum to the total", () => {
  const d = routingDigest(seeded());
  assert.equal(d.total, 9, "3 ARLC + 6 ARE lanes");
  assert.equal(d.by_source.ARLC, 3);
  assert.equal(d.by_source.ARE, 6);
  const srcSum = [...SOURCES, "UNKNOWN"].reduce((n, s) => n + d.by_source[s], 0);
  const destSum = DESTINATIONS.reduce((n, x) => n + d.by_destination[x], 0);
  assert.equal(srcSum, d.total, "source buckets must sum to total (no lost lane)");
  assert.equal(destSum, d.total, "destination buckets must sum to total (no lane routed nowhere)");
});

check("each destination is derived correctly across the mixed pair", () => {
  const d = routingDigest(seeded());
  assert.equal(d.by_destination.TERMINAL_0, 2, "arlc-ready + are-run route to the backend");
  assert.equal(d.by_destination.FOUNDER_INBOX, 2, "arlc-gate + are-founder route to the founder");
  assert.equal(d.by_destination.HUMAN_EXPERT, 1);
  assert.equal(d.by_destination.BLOCKED, 1);
  assert.equal(d.by_destination.HOLD, 1);
  assert.equal(d.by_destination.DONE, 2, "arlc-closed + are-pass are terminal");
  assert.equal(d.needs_human, 3, "FOUNDER_INBOX + HUMAN_EXPERT");
});

check("an ARLC lane that declares founder_gate_required routes to the FOUNDER, not the backend", () => {
  assert.equal(destOf({ lane_id: "x", state: "READY", founder_gate_required: true }, "ARLC"), "FOUNDER_INBOX");
});

check("ARE native gate states carry their destination in their name (honoured, not re-derived)", () => {
  assert.equal(destOf({ run_id: "x", state: "TRUE_FOUNDER_GATE" }, "ARE"), "FOUNDER_INBOX");
  assert.equal(destOf({ run_id: "x", state: "HUMAN_EXPERT_GATE" }, "ARE"), "HUMAN_EXPERT");
  assert.equal(destOf({ run_id: "x", state: "BLOCKED" }, "ARE"), "BLOCKED");
});

check("routing COMPOSES the frozen gate-router law: requested_authority is classified by classifyGate", () => {
  // production/live authority -> founder; legal/IP -> expert; routine -> backend. These are
  // exactly classifyGate's verdicts, mapped to destinations — the router does not fork them.
  assert.equal(classifyGate({ requested_authority: "production deploy" }), "TRUE_FOUNDER_GATE");
  assert.equal(destOf({ lane_id: "x", state: "READY", requested_authority: "production deploy" }, "ARLC"), "FOUNDER_INBOX");
  assert.equal(destOf({ lane_id: "x", state: "READY", requested_authority: "legal review" }, "ARLC"), "HUMAN_EXPERT");
  assert.equal(destOf({ lane_id: "x", state: "READY", requested_authority: "branch cleanup" }, "ARLC"), "TERMINAL_0");
});

check("THE SAFETY PROOF: an unknown lane (no state / no authority / no flag) FAILS CLOSED to the founder", () => {
  // never TERMINAL_0 — the router must not silently send unclassifiable work to the backend.
  assert.equal(destOf({ lane_id: "mystery", state: "SOME_STATE_WE_DO_NOT_KNOW" }, "ARLC"), "FOUNDER_INBOX");
  assert.equal(destOf({ run_id: "mystery" }, "ARE"), "FOUNDER_INBOX");
  const u = normalizeUnit({ lane_id: "mystery" }, "ARLC");
  assert.equal(u.gate_type, "UNKNOWN", "the gate type is said out loud as UNKNOWN, not guessed");
});

check("terminal states (ARE PASS, ARLC CLOSED) route to DONE — nothing left to route", () => {
  assert.equal(destOf({ run_id: "x", state: "PASS" }, "ARE"), "DONE");
  assert.equal(destOf({ lane_id: "x", state: "CLOSED" }, "ARLC"), "DONE");
});

check("routine progression states route to the backend (Terminal-0), not the founder", () => {
  for (const s of ["PLAN_CHECKED", "READY_TO_RUN", "RUNNING", "EVIDENCE_SEALING"]) {
    assert.equal(destOf({ run_id: "x", state: s }, "ARE"), "TERMINAL_0", `${s} should route to backend`);
  }
  assert.equal(destOf({ lane_id: "x", state: "READY" }, "ARLC"), "TERMINAL_0");
});

check("every FROZEN gate-router GATE_TYPE resolves to a valid destination (no taxonomy gap)", () => {
  // Proves the router covers the whole frozen taxonomy — no gate type falls through the map.
  for (const t of GATE_TYPES) {
    const dest = normalizeUnit({ lane_id: `g-${t}`, declared_type: t }, "ARLC").destination;
    // an explicit UNKNOWN declared_type is ignored (fails closed via the default path)
    assert.ok(DESTINATIONS.includes(dest), `gate type ${t} did not resolve to a valid destination (${dest})`);
  }
  // and UNKNOWN specifically fails closed to the founder
  assert.equal(normalizeUnit({ lane_id: "u", declared_type: "UNKNOWN" }, "ARLC").destination, "FOUNDER_INBOX");
});

check("routeQueues is PURE — it does not mutate the input snapshots", () => {
  const q = seeded();
  const snapshot = JSON.stringify(q);
  routeQueues(q);
  assert.equal(JSON.stringify(q), snapshot, "routing mutated the input");
});

check("routeQueues is triage-ordered (founder-facing first) and DETERMINISTIC", () => {
  const routed = routeQueues(seeded());
  const rankSeq = routed.map((u) => DESTINATIONS.indexOf(u.destination)); // not the order we assert on
  // assert the triage order: FOUNDER_INBOX/HUMAN_EXPERT/BLOCKED come before TERMINAL_0/DONE
  const firstBackend = routed.findIndex((u) => u.destination === "TERMINAL_0" || u.destination === "DONE");
  const lastHuman = routed.map((u) => u.destination).lastIndexOf("HUMAN_EXPERT");
  assert.ok(firstBackend > lastHuman, "human-facing lanes must be listed before backend/done lanes");
  assert.equal(routed[0].destination, "FOUNDER_INBOX", "the most-attention lane leads the list");
  // determinism: same snapshots -> byte-identical rendering
  assert.equal(renderSurfaceText(seeded()), renderSurfaceText(seeded()));
  assert.equal(renderSurfaceHtml(seeded()), renderSurfaceHtml(seeded()));
  void rankSeq;
});

check("a missing id fails CLOSED by throwing — the router never invents an identity", () => {
  assert.throws(() => normalizeUnit({ state: "READY" }, "ARLC"), LaneRouterError);
  assert.throws(() => normalizeUnit(null, "ARE"), LaneRouterError);
});

check("an unrecognised source is reported as UNKNOWN, never coerced into ARLC/ARE", () => {
  const u = normalizeUnit({ lane_id: "x", state: "READY" }, "MYSTERY_SOURCE");
  assert.equal(u.source, "UNKNOWN");
  const d = routingDigest({ arlc: [{ lane_id: "x", state: "READY" }] });
  assert.equal(d.by_source.UNKNOWN, 0, "a known-source lane is not miscounted as unknown");
});

check("data-class redaction flows THROUGH: a protected lane is still ROUTED, but its title is hidden", () => {
  const hostile = { are: { items: [
    { run_id: "are-secret", state: "TRUE_FOUNDER_GATE", data_class: "SECRET", title: "acquire competitor XYZ" },
    { run_id: "are-open", state: "RUNNING", data_class: "PUBLIC", title: "ordinary run" },
  ] } };
  const d = routingDigest(hostile);
  assert.equal(d.total, 2);
  assert.equal(d.protected, 1, "the SECRET lane is tallied as protected");
  assert.equal(d.by_destination.FOUNDER_INBOX, 1, "and it is STILL routed — the founder sees WHERE, not WHAT");
  const html = renderSurfaceHtml(hostile);
  const text = renderSurfaceText(hostile);
  for (const secret of ["acquire competitor XYZ"]) {
    assert.ok(!html.includes(secret), `surface html leaked protected content: ${secret}`);
    assert.ok(!text.includes(secret), `surface text leaked protected content: ${secret}`);
  }
  assert.ok(html.includes(REDACTED), "surface shows the redaction marker instead");
  assert.ok(html.includes("are-secret"), "the protected lane's structural id is still shown (routing is not content)");
});

check("renderDigestText omits the protected line when nothing is protected", () => {
  assert.ok(!renderDigestText(seeded()).includes("Protected"));
});

check("renderSurfaceHtml is a COMPLETE page embedding the routing summary and the routed list", () => {
  const html = renderSurfaceHtml(seeded());
  assert.match(html, /^<!doctype html>/i);
  assert.ok(html.includes("<head>") && html.includes("</head>"), "has <head>");
  assert.ok(html.includes("<body>") && html.includes("</body>"), "has <body>");
  assert.ok(html.includes("</html>"), "closes </html>");
  assert.ok(html.includes("Routing summary"), "embeds the digest section");
  assert.ok(html.includes("Lane Routing"), "embeds the surface heading");
  assert.ok(html.includes("Merge qualified PR"), "embeds a routed lane title");
});

check("THE CRITICAL PROOF: the surface page has NO act affordance (no script/form/button/input/handler/link)", () => {
  const html = renderSurfaceHtml(seeded());
  assert.ok(!/<script/i.test(html), "no <script>");
  assert.ok(!/<form/i.test(html), "no <form>");
  assert.ok(!/<button/i.test(html), "no <button>");
  assert.ok(!/<input/i.test(html), "no <input>");
  assert.ok(!/\son\w+=/i.test(html), "no inline on* event handler");
  assert.ok(!/href\s*=/i.test(html), "no navigable link");
  assert.ok(/read-only/i.test(html), "the page states it is read-only");
});

check("the surface escapes lane content — content can't become markup", () => {
  const html = renderSurfaceHtml({ arlc: [{ lane_id: "q1", state: "READY", data_class: "PUBLIC", title: '<b>x</b> & "y"' }] });
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt;"), "angle brackets escaped");
  assert.ok(!html.includes("<b>x</b>"), "raw markup must not appear");
});

check("empty pair renders read-only, no-action language in both text and html", () => {
  assert.ok(/read-only/i.test(renderRoutedText({})));
  assert.ok(/read-only/i.test(renderRoutedHtml({})));
  assert.ok(/sends nothing|never sends/i.test(renderSurfaceHtml({})), "the surface says it sends nothing");
});

check("NO ACT EDGE (source scan): the router imports no side-effect built-in and no v8b1", () => {
  const src = sourceOf("lane-router.mjs");
  const SIDE_EFFECT_IMPORTS = [
    "node:fs", "node:child_process", "node:net", "node:http", "node:https",
    "node:dgram", "node:worker_threads", "node:process", "child_process",
  ];
  for (const imp of SIDE_EFFECT_IMPORTS) {
    assert.ok(!src.includes(`"${imp}"`) && !src.includes(`'${imp}'`), `router imports ${imp}`);
  }
  const SIDE_EFFECT_CALLS = ["writeFileSync", "writeFile", "appendFile", "spawn", "exec(", "execSync", "fetch(", "Date.now(", "process.exit", "eval("];
  for (const call of SIDE_EFFECT_CALLS) {
    assert.ok(!src.includes(call), `router contains side-effecting token ${call}`);
  }
  assert.ok(!/v8b1/i.test(src), "router must not reference v8b1 (lane isolation)");
});

check("NO ACT EDGE (export scan): no exported function reads like an act/approve/execute edge", () => {
  const ACT_WORDS = /^(execute|exec|act|run|approve|approval|commit|dispatch|perform|apply|send|write|save|persist|mutate|spawn|launch|start|stop|rollback|revoke|merge|mintToken|token)/i;
  const names = Object.keys(router).filter((k) => typeof router[k] === "function");
  const allowed = new Set([
    "normalizeUnit", "routeQueues", "routingDigest",
    "renderDigestText", "renderRoutedText", "renderDigestHtml", "renderRoutedHtml",
    "renderSurfaceHtml", "renderSurfaceText", "LaneRouterError",
  ]);
  for (const n of names) {
    assert.ok(allowed.has(n), `unexpected exported function on router: ${n}`);
    assert.ok(!ACT_WORDS.test(n), `router export ${n} reads like an act edge`);
  }
  assert.equal(ROUTER_VERSION, "1.0.0");
});

console.log(`\nV8B2-LANE-ROUTER-SELFTEST: PASS (${pass} checks)`);
