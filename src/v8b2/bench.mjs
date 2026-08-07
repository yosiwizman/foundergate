// FounderGate V8-B VB2 — BENCH v1 (read-only, NON-EXECUTING).
//
// Plain English: after a stretch of autonomous work the founder wants ONE honest
// scoreboard that answers three questions without opening a terminal:
//   1. "What was built, and did it actually prove itself here?" — the COMPONENT result
//      ledger (every component and whether its self-test is green in this repo).
//   2. "Which of my projects have a recorded result?" — the PROJECT result ledger.
//   3. "How much hand-work did all of this cost ME?" — the founder HAND-BURDEN score
//      (the count of UNNECESSARY founder technical operations — clicks, terminal
//      actions, debugging, raw-log reading — NOT founder decisions, which are direction).
// This module is that bench — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes snapshots the caller supplies and
//     RETURNS a plain object or a STRING. It never acts, approves, runs, merges, or
//     executes anything, and it never reads the disk to find results itself.
//   - NO side effects: no fs, no network, no child_process, no clock, no randomness. The
//     ledger is DERIVED from the snapshots the caller supplies — VB2 never invents state
//     (Law 54). An absent result reads as UNKNOWN, never guessed to PASS; an absent
//     hand-burden metric makes the score UNKNOWN, never silently 0. A clean bench must be
//     PROVEN clean, not assumed clean.
//   - It REUSES the frozen data-class law, it does not fork it: a project whose data class
//     is not displayable keeps its STRUCTURE visible (id + result — a result is a fact,
//     not content) but its human name is redacted through the frozen cto-queue rule
//     (isDisplayableClass / REDACTED).
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>,
//     <form>, <button>, on* handler, or navigable link. Showing a score is not the same as
//     acting on it — the act edge (approve / run / merge) stays frozen to VB3.
//
// Honesty over completeness: counts are zero-filled per result bucket so an absent result
// reads as 0, never omitted; a result outside the known enum is said out loud as UNKNOWN
// rather than coerced into PASS/FAIL. The hand-burden verdict is UNKNOWN unless EVERY
// burden input is present — you cannot claim "zero hand-burden" over metrics you don't have.

import { isDisplayableClass, REDACTED, UNKNOWN } from "./cto-queue.mjs";

export const BENCH_VERSION = "1.0.0";

// A component/project result. UNKNOWN is a first-class, honest value — never a stand-in
// for PASS. Anything outside this enum is normalised to UNKNOWN (Law 54).
export const RESULT = Object.freeze(["PASS", "FAIL", UNKNOWN]);

// The founder technical operations that COUNT as hand-burden — the things a founder had to
// do with their own hands that a truly autonomous harness should not have required. These
// are the score. (Founder DECISIONS are direction, not burden — see DIRECTION_FIELDS.)
export const BURDEN_FIELDS = Object.freeze([
  "founder_clicks",
  "founder_terminal_actions",
  "founder_debugging_actions",
  "founder_raw_log_reviews",
]);

// Founder inputs that are legitimate DIRECTION, not burden. They are shown for context so
// the score is not mistaken for "the founder did nothing" — the founder supplied direction;
// what the bench measures is whether that direction cost them any hand-work to carry out.
export const DIRECTION_FIELDS = Object.freeze([
  "founder_prompts_provided",
  "founder_signatures_provided",
]);

const RESULT_LABEL = Object.freeze({ PASS: "Proven", FAIL: "Failed", [UNKNOWN]: "Unknown" });

const BURDEN_LABEL = Object.freeze({
  founder_clicks: "Clicks",
  founder_terminal_actions: "Terminal actions",
  founder_debugging_actions: "Debugging actions",
  founder_raw_log_reviews: "Raw-log reviews",
});

const DIRECTION_LABEL = Object.freeze({
  founder_prompts_provided: "Prompts",
  founder_signatures_provided: "Signatures",
});

const VERDICT_LABEL = Object.freeze({
  ZERO_HAND_BURDEN: "Zero founder hand-burden",
  HAND_BURDEN_PRESENT: "Founder hand-burden present",
  [UNKNOWN]: "Hand-burden unknown (incomplete metrics)",
});

// A non-negative finite number, or UNKNOWN. A missing/garbage/negative value is UNKNOWN —
// never coerced to 0, because 0 is a real claim ("none") and we must not fake it (Law 54).
function num(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : UNKNOWN;
}

// Length of an array, or UNKNOWN if it is not an array (absent evidence, not "zero").
function countArr(v) {
  return Array.isArray(v) ? v.length : UNKNOWN;
}

// Sum that stays honest: if ANY input is UNKNOWN the whole sum is UNKNOWN. A total is only
// trustworthy when every part of it is known.
function sumOrUnknown(vals) {
  let total = 0;
  for (const v of vals) {
    if (v === UNKNOWN) return UNKNOWN;
    total += v;
  }
  return total;
}

function normalizeResult(r) {
  return RESULT.includes(r) ? r : UNKNOWN;
}

function asId(v) {
  return v == null ? UNKNOWN : String(v);
}

// componentLedger(components) -> a PURE derived summary of "what proved itself here".
// Read-only: it never touches the disk; the caller supplies the records (each shaped like a
// self-test runner result: {id, name, selftest, result, checks}). Honest: every result
// bucket is present and zero-filled; a result outside the enum falls into UNKNOWN, never
// PASS. `proven` is exactly PASS; `unproven` is everything that is NOT proven (FAIL or
// UNKNOWN both count as not proven — an unknown result is not a pass). `checks_proven`
// tallies the self-test checks standing behind the PROVEN components only.
export function componentLedger(components) {
  const list = Array.isArray(components) ? components : [];
  const by_result = Object.fromEntries(RESULT.map((r) => [r, 0]));
  const items = [];
  let checksProven = 0;
  for (const c of list) {
    const src = c && typeof c === "object" ? c : {};
    const result = normalizeResult(src.result);
    by_result[result] += 1;
    const checks = num(src.checks);
    if (result === "PASS" && checks !== UNKNOWN) checksProven += checks;
    items.push(Object.freeze({
      id: asId(src.id),
      name: asId(src.name),
      selftest: asId(src.selftest),
      result,
      checks,
    }));
  }
  return {
    total: list.length,
    by_result,
    proven: by_result.PASS,
    unproven: list.length - by_result.PASS,
    checks_proven: checksProven,
    items: Object.freeze(items),
  };
}

// projectLedger(projects) -> a PURE derived per-project result ledger. Honest counts (zero-
// filled buckets, UNKNOWN for out-of-enum). Data-class redaction flows through the FROZEN
// cto-queue rule: a project whose data class is not displayable is TALLIED as protected and
// its human name is replaced by the redaction marker — but its RESULT stays visible, because
// "this project passed/failed" is a structural fact, not the project's private content.
export function projectLedger(projects) {
  const list = Array.isArray(projects) ? projects : [];
  const by_result = Object.fromEntries(RESULT.map((r) => [r, 0]));
  const items = [];
  let protectedCount = 0;
  for (const p of list) {
    const src = p && typeof p === "object" ? p : {};
    const result = normalizeResult(src.result);
    by_result[result] += 1;
    const displayable = isDisplayableClass(src.data_class);
    if (!displayable) protectedCount += 1;
    items.push(Object.freeze({
      id: asId(src.id),
      name: displayable ? asId(src.name) : REDACTED,
      result,
      protected: !displayable,
      runs: num(src.runs),
    }));
  }
  return {
    total: list.length,
    by_result,
    protected: protectedCount,
    items: Object.freeze(items),
  };
}

// burdenDigest(metrics) -> the derived founder HAND-BURDEN score. `hand_ops` is the sum of
// the BURDEN_FIELDS (the unnecessary founder technical operations); it is UNKNOWN unless
// EVERY burden field is present — a clean score must be proven, not assumed. `direction`
// surfaces the legitimate founder inputs (prompts/signatures) so the score is not misread as
// "the founder was absent". `gates_suppressed` / `routine_autonomous` count the burden that
// was AVOIDED (false gates the harness declined to raise; routine work it did on its own).
export function burdenDigest(metrics) {
  const m = metrics && typeof metrics === "object" ? metrics : {};
  const breakdown = {};
  for (const f of BURDEN_FIELDS) breakdown[f] = num(m[f]);
  const hand_ops = sumOrUnknown(BURDEN_FIELDS.map((f) => breakdown[f]));
  const direction = {};
  for (const f of DIRECTION_FIELDS) direction[f] = num(m[f]);
  let verdict;
  if (hand_ops === UNKNOWN) verdict = UNKNOWN;
  else if (hand_ops === 0) verdict = "ZERO_HAND_BURDEN";
  else verdict = "HAND_BURDEN_PRESENT";
  return {
    hand_ops,
    breakdown,
    direction,
    gates_suppressed: countArr(m.false_founder_gates_suppressed),
    routine_autonomous: countArr(m.routine_actions_completed_autonomously),
    verdict,
  };
}

// benchDigest({components, projects, burden}) -> the whole bench in one PURE object: the two
// ledgers, the hand-burden score, and a one-glance headline. Missing sections degrade to
// empty/UNKNOWN honestly rather than throwing.
export function benchDigest(input) {
  const src = input && typeof input === "object" ? input : {};
  const components = componentLedger(src.components);
  const projects = projectLedger(src.projects);
  const burden = burdenDigest(src.burden);
  return {
    components,
    projects,
    burden,
    headline: {
      components_proven: components.proven,
      components_total: components.total,
      projects_total: projects.total,
      hand_ops: burden.hand_ops,
      verdict: burden.verdict,
    },
  };
}

// ── text renderers ──────────────────────────────────────────────────────────────────────

function showNum(v) {
  return v === UNKNOWN ? "—" : String(v);
}

export function renderComponentLedgerText(components) {
  const d = componentLedger(components);
  const lines = [
    "COMPONENT RESULT LEDGER (read-only; counts proven self-tests, takes no action)",
    `Proven: ${d.proven}/${d.total}   ` +
      `(${RESULT_LABEL.FAIL}: ${d.by_result.FAIL} · ${RESULT_LABEL[UNKNOWN]}: ${d.by_result[UNKNOWN]})`,
    `Self-test checks behind proven components: ${d.checks_proven}`,
  ];
  for (const it of d.items) {
    const checks = it.checks === UNKNOWN ? "checks unknown" : `${it.checks} checks`;
    lines.push(`  [${RESULT_LABEL[it.result]}] ${it.name} — ${it.selftest} (${checks})`);
  }
  return lines.join("\n");
}

export function renderProjectLedgerText(projects) {
  const d = projectLedger(projects);
  const lines = [
    "PROJECT RESULT LEDGER (read-only; per-project results, content redacted by class)",
    `Projects: ${d.total}   ` +
      `(${RESULT_LABEL.PASS}: ${d.by_result.PASS} · ${RESULT_LABEL.FAIL}: ${d.by_result.FAIL} · ` +
      `${RESULT_LABEL[UNKNOWN]}: ${d.by_result[UNKNOWN]})`,
  ];
  if (d.protected > 0) lines.push(`  Protected (name hidden): ${d.protected}`);
  for (const it of d.items) {
    const runs = it.runs === UNKNOWN ? "runs unknown" : `${it.runs} runs`;
    lines.push(`  [${RESULT_LABEL[it.result]}] ${it.name} — ${it.id} (${runs})`);
  }
  return lines.join("\n");
}

export function renderBurdenText(metrics) {
  const d = burdenDigest(metrics);
  const lines = [
    "FOUNDER HAND-BURDEN (read-only; counts unnecessary founder technical operations)",
    `Hand-operations required of the founder: ${showNum(d.hand_ops)}  →  ${VERDICT_LABEL[d.verdict]}`,
  ];
  for (const f of BURDEN_FIELDS) lines.push(`  ${BURDEN_LABEL[f]}: ${showNum(d.breakdown[f])}`);
  const dir = DIRECTION_FIELDS.map((f) => `${DIRECTION_LABEL[f]}: ${showNum(d.direction[f])}`);
  lines.push(`  Direction supplied (not burden) — ${dir.join(" · ")}`);
  lines.push(
    `  Burden avoided — false gates suppressed: ${showNum(d.gates_suppressed)} · ` +
      `routine actions done autonomously: ${showNum(d.routine_autonomous)}`,
  );
  return lines.join("\n");
}

// ── html renderers ──────────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statCard(label, value, cls) {
  return (
    `    <div class="fg-stat ${cls}">` +
    `<span class="fg-stat-value">${escapeHtml(value)}</span>` +
    `<span class="fg-stat-label">${escapeHtml(label)}</span>` +
    `</div>`
  );
}

// A result pill — class carries the colour; the label is the founder-readable word. A FAIL
// pill is the only place red is used (a real problem); PROVEN is green, UNKNOWN is calm purple.
function resultPill(result) {
  return `<span class="fg-pill fg-pill-${escapeHtml(result)}">${escapeHtml(RESULT_LABEL[result])}</span>`;
}

export function renderComponentLedgerHtml(components) {
  const d = componentLedger(components);
  const rows = d.items.map((it) => {
    const checks = it.checks === UNKNOWN ? "checks unknown" : `${it.checks} checks`;
    return (
      `      <li class="fg-row">` +
      `${resultPill(it.result)}` +
      `<span class="fg-name">${escapeHtml(it.name)}</span>` +
      `<span class="fg-meta">${escapeHtml(it.selftest)} · ${escapeHtml(checks)}</span>` +
      `</li>`
    );
  });
  return [
    `<section class="fg-card" aria-readonly="true">`,
    `  <h2>Component result ledger</h2>`,
    `  <p class="fg-note">What was built and whether it proves itself here. Proven means its self-test runs green in this repository.</p>`,
    `  <div class="fg-stat-row">`,
    statCard("Proven", `${d.proven}/${d.total}`, "fg-stat-done"),
    statCard("Failed", d.by_result.FAIL, "fg-stat-fail"),
    statCard("Unknown", d.by_result[UNKNOWN], "fg-stat-unknown"),
    statCard("Proven checks", d.checks_proven, "fg-stat-total"),
    `  </div>`,
    `  <ul class="fg-list">`,
    ...(rows.length ? rows : [`      <li class="fg-empty">No components recorded.</li>`]),
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

export function renderProjectLedgerHtml(projects) {
  const d = projectLedger(projects);
  const rows = d.items.map((it) => {
    const runs = it.runs === UNKNOWN ? "runs unknown" : `${it.runs} runs`;
    const cls = it.protected ? " fg-row-protected" : "";
    return (
      `      <li class="fg-row${cls}">` +
      `${resultPill(it.result)}` +
      `<span class="fg-name">${escapeHtml(it.name)}</span>` +
      `<span class="fg-meta">${escapeHtml(it.id)} · ${escapeHtml(runs)}</span>` +
      `</li>`
    );
  });
  const cards = [
    statCard("Projects", d.total, "fg-stat-total"),
    statCard("Proven", d.by_result.PASS, "fg-stat-done"),
    statCard("Failed", d.by_result.FAIL, "fg-stat-fail"),
    statCard("Unknown", d.by_result[UNKNOWN], "fg-stat-unknown"),
  ];
  if (d.protected > 0) cards.push(statCard("Protected", d.protected, "fg-stat-protected"));
  return [
    `<section class="fg-card" aria-readonly="true">`,
    `  <h2>Project result ledger</h2>`,
    `  <p class="fg-note">A per-project result. A protected project's name is hidden; its result is still shown because a result is a fact, not private content.</p>`,
    `  <div class="fg-stat-row">`,
    ...cards,
    `  </div>`,
    `  <ul class="fg-list">`,
    ...(rows.length ? rows : [`      <li class="fg-empty">No projects recorded.</li>`]),
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

export function renderBurdenHtml(metrics) {
  const d = burdenDigest(metrics);
  const verdictCls =
    d.verdict === "ZERO_HAND_BURDEN" ? "fg-stat-done" :
    d.verdict === "HAND_BURDEN_PRESENT" ? "fg-stat-fail" : "fg-stat-unknown";
  const breakdown = BURDEN_FIELDS.map((f) =>
    `      <li class="fg-row"><span class="fg-name">${escapeHtml(BURDEN_LABEL[f])}</span>` +
    `<span class="fg-meta">${escapeHtml(showNum(d.breakdown[f]))}</span></li>`,
  );
  const dir = DIRECTION_FIELDS
    .map((f) => `${escapeHtml(DIRECTION_LABEL[f])}: ${escapeHtml(showNum(d.direction[f]))}`)
    .join(" · ");
  return [
    `<section class="fg-card" aria-readonly="true">`,
    `  <h2>Founder hand-burden</h2>`,
    `  <p class="fg-note">How much hand-work the run cost the founder — the count of technical operations they had to perform themselves. Founder decisions are direction, not burden, and are shown separately.</p>`,
    `  <div class="fg-stat-row">`,
    statCard("Hand-operations", showNum(d.hand_ops), verdictCls),
    statCard("False gates suppressed", showNum(d.gates_suppressed), "fg-stat-total"),
    statCard("Routine done autonomously", showNum(d.routine_autonomous), "fg-stat-total"),
    `  </div>`,
    `  <p class="fg-verdict fg-verdict-${escapeHtml(d.verdict)}">${escapeHtml(VERDICT_LABEL[d.verdict])}</p>`,
    `  <ul class="fg-list">`,
    ...breakdown,
    `  </ul>`,
    `  <p class="fg-note">Direction supplied (not burden) — ${dir}</p>`,
    `</section>`,
  ].join("\n");
}

// The self-contained style for the bench surface. Inlined (not a linked stylesheet) so the
// rendered page is a PORTABLE evidence artifact that stands alone. Shares the founder palette
// with the sibling surfaces (src/ui/tokens.css) for visual kinship. Style only — no
// behaviour; a <style> block cannot act. Colour law honoured: green = proven, calm purple =
// unknown/protected, amber = attention, and RED is reserved for a real FAIL only.
const SURFACE_STYLE = `
    :root{
      --bg:#0d1117;--panel:#161c26;--panel2:#1b2230;--line:#2a3344;
      --text:#e6ebf2;--muted:#93a0b4;--dim:#6b7789;
      --blue:#3b82f6;--green:#22c55e;--amber:#f5b83d;--purple:#a78bfa;--red:#f87171;--radius:12px;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);
      font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    .fg-wrap{max-width:920px;margin:0 auto;padding:32px 20px 56px}
    .fg-eyebrow{color:var(--purple);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
    h1{font-size:27px;margin:.2em 0 .1em}
    h2{font-size:16px;margin:0 0 .4em}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.1em 0 14px}
    .fg-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-stat-row{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:14px}
    .fg-stat{flex:1 1 120px;background:var(--panel2);border:1px solid var(--line);
      border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
    .fg-stat-value{font-size:26px;font-weight:700}
    .fg-stat-label{color:var(--muted);font-size:12.5px}
    .fg-stat-done .fg-stat-value{color:var(--green)}
    .fg-stat-fail .fg-stat-value{color:var(--red)}
    .fg-stat-unknown .fg-stat-value,.fg-stat-protected .fg-stat-value{color:var(--purple)}
    .fg-list{list-style:none;margin:0;padding:0}
    .fg-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;
      padding:10px 12px;margin:0 0 8px;background:var(--panel2)}
    .fg-row-protected{border-style:dashed}
    .fg-pill{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
      border-radius:999px;padding:1px 8px;white-space:nowrap}
    .fg-pill-PASS{color:var(--green);border:1px solid rgba(34,197,94,.4)}
    .fg-pill-FAIL{color:var(--red);border:1px solid rgba(248,113,113,.45)}
    .fg-pill-UNKNOWN{color:var(--purple);border:1px solid rgba(167,139,250,.4)}
    .fg-name{font-weight:600}
    .fg-meta{color:var(--muted);font-size:12.5px;margin-left:auto;text-align:right}
    .fg-verdict{font-weight:600;margin:.2em 0 12px}
    .fg-verdict-ZERO_HAND_BURDEN{color:var(--green)}
    .fg-verdict-HAND_BURDEN_PRESENT{color:var(--red)}
    .fg-verdict-UNKNOWN{color:var(--purple)}
    .fg-empty{color:var(--muted)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

function indent(block) {
  return block.split("\n").map((l) => (l === "" ? l : `    ${l}`)).join("\n");
}

// renderSurfaceHtml(bench) -> a COMPLETE, self-contained founder-readable page. `bench` is
// the {components, projects, burden} snapshot. Pure: same snapshot in, byte-identical page
// out (no clock, no randomness). It carries NO <script>, <form>, <button>, on* handler, or
// navigable link — the page is observably read-only. Data-class redaction flows through:
// a protected project's name never appears in the clear on this surface either.
export function renderSurfaceHtml(bench) {
  const src = bench && typeof bench === "object" ? bench : {};
  const digest = benchDigest(src);
  const h = digest.headline;
  const verdictCls =
    h.verdict === "ZERO_HAND_BURDEN" ? "fg-stat-done" :
    h.verdict === "HAND_BURDEN_PRESENT" ? "fg-stat-fail" : "fg-stat-unknown";
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Bench — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Bench</h1>`,
    `    <p class="fg-sub">One honest scoreboard: what was built and proved itself here, which projects have a result, and how much hand-work the run cost you. This surface only shows results — it approves nothing, runs nothing, and sends nothing.</p>`,
    `    <div class="fg-card">`,
    `      <h2>At a glance</h2>`,
    `      <div class="fg-stat-row">`,
    statCard("Components proven", `${h.components_proven}/${h.components_total}`, "fg-stat-done"),
    statCard("Projects", h.projects_total, "fg-stat-total"),
    statCard("Founder hand-operations", showNum(h.hand_ops), verdictCls),
    `      </div>`,
    `    </div>`,
    indent(renderComponentLedgerHtml(src.components)),
    indent(renderProjectLedgerHtml(src.projects)),
    indent(renderBurdenHtml(src.burden)),
    `    <p class="fg-foot">Read-only view · the act edge (approve / run / merge) is not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// renderSurfaceText(bench) -> plain-text bench (all three sections). Pure. Useful for a
// terminal/log rendering and for tests that assert content without HTML.
export function renderSurfaceText(bench) {
  const src = bench && typeof bench === "object" ? bench : {};
  return [
    "BENCH — SUMMARY (read-only; shows results, takes no action)",
    "",
    renderComponentLedgerText(src.components),
    "",
    renderProjectLedgerText(src.projects),
    "",
    renderBurdenText(src.burden),
  ].join("\n");
}
