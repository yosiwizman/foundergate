// FounderGate V8-B VB2 — PROJECT BENCH (read-only, NON-EXECUTING).
//
// Plain English: Bench v1 already gives the founder a flat PROJECT ROSTER — one line per
// project, one result each. That roster answers "how many of my projects passed?" but it
// CANNOT answer the harder, more honest question: "did this project stay working, or did it
// pass once and quietly break?" A single supplied PASS/FAIL flag hides that entirely.
//
// PROJECT BENCH is the per-project DETAIL ledger that closes that gap. For each project it
// composes the project's OWN record from its run TIMELINE and derives the result rather than
// trusting a supplied flag:
//   1. "What is this project's result?" — DERIVED from its runs: the LATEST run wins. A
//      project with no runs is UNKNOWN, never flattered to PASS (Law 54). The caller cannot
//      hand us a stale "PASS" over a timeline whose last run failed.
//   2. "Did it regress?" — a project whose latest run FAILED but which PASSED earlier is a
//      REGRESSION: it worked and now doesn't. That is the single most important thing a
//      founder must see, and a flat roster structurally cannot show it. Project Bench raises
//      it as its own headline number.
//   3. "What did this project actually ship, and did those pieces prove themselves?" — the
//      per-project DELIVERABLE proof (reusing the frozen component ledger over the components
//      attributed to this project).
//
// This module is that detail ledger — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes snapshots the caller supplies and
//     RETURNS a plain object or a STRING. It never acts, approves, runs, merges, or executes
//     anything, and it never reads the disk to find results itself.
//   - NO side effects: no fs, no network, no child_process, no clock, no randomness. The run
//     order is the order the CALLER supplies (oldest → newest); a run's timestamp is inert
//     DATA displayed verbatim, never parsed and never compared against a system clock. VB2
//     never invents state.
//   - It REUSES the frozen laws, it does not fork them: the RESULT enum and the deliverable
//     tally come from the sibling Bench module; the data-class redaction comes from the frozen
//     cto-queue rule. A project whose data class is not displayable keeps its result, its
//     timeline shape, and its regression flag visible (those are structural FACTS) while its
//     human name is redacted.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>,
//     <form>, <button>, <input>, on* handler, or navigable link. Showing a project's history
//     is not the same as acting on it — the act edge (approve / run / merge) stays frozen to VB3.

import { isDisplayableClass, REDACTED, UNKNOWN } from "./cto-queue.mjs";
import { RESULT, componentLedger } from "./bench.mjs";

export const PROJECT_BENCH_VERSION = "1.0.0";

// A project's DERIVED status. PROVEN means its latest run passed; FAILED means its latest run
// failed; UNKNOWN means it has no runs or its latest run's result is unknown. UNKNOWN is a
// first-class, honest value — never a stand-in for PROVEN.
export const STATUS = Object.freeze(["PROVEN", "FAILED", UNKNOWN]);

const RESULT_LABEL = Object.freeze({ PASS: "Proven", FAIL: "Failed", [UNKNOWN]: "Unknown" });
const STATUS_LABEL = Object.freeze({ PROVEN: "Proven", FAILED: "Failed", [UNKNOWN]: "Unknown" });

// A non-negative finite number, or UNKNOWN. A missing/garbage/negative value is UNKNOWN —
// never coerced to 0, because 0 is a real claim ("none") and we must not fake it (Law 54).
function num(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : UNKNOWN;
}

function normalizeResult(r) {
  return RESULT.includes(r) ? r : UNKNOWN;
}

function asId(v) {
  return v == null ? UNKNOWN : String(v);
}

// projectRecord(project) -> a PURE per-project detail record derived from the project's run
// TIMELINE. `project` is shaped { id, name, data_class, runs:[{run_id,result,at}...],
// components:[...] }. Runs are the caller's chronological order (oldest → newest); we do not
// sort by time (no clock, no timestamp parsing) — the LAST run is the latest by construction.
//
// Honesty rules that make this different from a flat roster:
//   - `status` is DERIVED from `current` (the latest run), never from a supplied result flag.
//     No runs -> UNKNOWN, never PROVEN.
//   - `regression` is true iff the latest run FAILED and some EARLIER run PASSED — "it worked
//     and now doesn't". A flat roster cannot express this; here it is a first-class field.
//   - `recovered` is true iff the latest run PASSED and some earlier run FAILED — the honest
//     mirror (don't only surface bad news; a fix is a fact too).
//   - `pass_streak` counts the trailing consecutive PASSes: how long it has been green right
//     now. It is 0 the moment the latest run is not a PASS.
export function projectRecord(project) {
  const src = project && typeof project === "object" ? project : {};
  const displayable = isDisplayableClass(src.data_class);

  const rawRuns = Array.isArray(src.runs) ? src.runs : [];
  const by_result = Object.fromEntries(RESULT.map((r) => [r, 0]));
  const runs = rawRuns.map((r) => {
    const rs = r && typeof r === "object" ? r : {};
    const result = normalizeResult(rs.result);
    by_result[result] += 1;
    return Object.freeze({
      run_id: asId(rs.run_id),
      result,
      // `at` is inert DATA displayed verbatim — never parsed, never compared to a clock.
      at: asId(rs.at),
    });
  });

  const last = runs.length ? runs[runs.length - 1].result : UNKNOWN;
  const prev = runs.length >= 2 ? runs[runs.length - 2].result : UNKNOWN;

  let status;
  if (last === "PASS") status = "PROVEN";
  else if (last === "FAIL") status = "FAILED";
  else status = UNKNOWN;

  const earlier = runs.slice(0, -1).map((r) => r.result);
  const regression = last === "FAIL" && earlier.includes("PASS");
  const recovered = last === "PASS" && earlier.includes("FAIL");

  let pass_streak = 0;
  for (let i = runs.length - 1; i >= 0 && runs[i].result === "PASS"; i--) pass_streak += 1;

  // Per-project deliverables: reuse the FROZEN component ledger over this project's components
  // so "did the pieces this project shipped prove themselves?" is answered the same way the
  // component bench answers it — one tally law, not two.
  const deliverables = componentLedger(src.components);

  return {
    id: asId(src.id),
    name: displayable ? asId(src.name) : REDACTED,
    protected: !displayable,
    status,
    current: last,
    previous: prev,
    regression,
    recovered,
    pass_streak,
    runs_total: runs.length,
    by_result,
    runs: Object.freeze(runs),
    deliverables: {
      total: deliverables.total,
      proven: deliverables.proven,
      unproven: deliverables.unproven,
      checks_proven: deliverables.checks_proven,
      items: deliverables.items,
    },
  };
}

// projectBench(projects) -> the whole per-project detail bench: every project's record plus an
// honest rollup. `regressed` is the headline number — projects that passed and later broke.
// `by_status` buckets are zero-filled and present; a project with no runs is counted UNKNOWN,
// never proven. `protected` tallies the projects whose name is redacted by data class.
export function projectBench(projects) {
  const list = Array.isArray(projects) ? projects : [];
  const items = list.map(projectRecord).map(Object.freeze);
  const by_status = Object.fromEntries(STATUS.map((s) => [s, 0]));
  let regressed = 0;
  let recovered = 0;
  let protectedCount = 0;
  for (const it of items) {
    by_status[it.status] += 1;
    if (it.regression) regressed += 1;
    if (it.recovered) recovered += 1;
    if (it.protected) protectedCount += 1;
  }
  return {
    total: list.length,
    by_status,
    proven: by_status.PROVEN,
    regressed,
    recovered,
    protected: protectedCount,
    items,
    headline: {
      projects_total: list.length,
      projects_proven: by_status.PROVEN,
      projects_regressed: regressed,
    },
  };
}

// ── text renderers ──────────────────────────────────────────────────────────────────────

function showNum(v) {
  return v === UNKNOWN ? "—" : String(v);
}

// Render one ALREADY-DERIVED record as text. Kept internal so the bench renderer can format
// the records it already has without deriving them a second time (a re-derive would strip the
// data_class the record no longer carries and wrongly redact every name).
function recordText(r) {
  const flags = [];
  if (r.regression) flags.push("REGRESSED (passed before, latest run failed)");
  else if (r.recovered) flags.push("recovered (failed before, latest run passed)");
  if (r.status === "PROVEN" && r.pass_streak > 0) flags.push(`${r.pass_streak} consecutive proven`);
  const flagStr = flags.length ? ` — ${flags.join("; ")}` : "";
  const deliv = r.deliverables.total
    ? `${r.deliverables.proven}/${r.deliverables.total} deliverables proven`
    : "no deliverables recorded";
  const lines = [
    `[${STATUS_LABEL[r.status]}] ${r.name} — ${r.id}${flagStr}`,
    `    ${r.runs_total} runs · ${deliv}`,
  ];
  for (const run of r.runs) {
    lines.push(`    · [${RESULT_LABEL[run.result]}] ${run.run_id} (${run.at})`);
  }
  return lines.join("\n");
}

// One project as plain text (public): derive the raw project, then format it. The protected
// name never appears in the clear.
export function renderProjectRecordText(project) {
  return recordText(projectRecord(project));
}

// The whole per-project bench as plain text: rollup then one block per project.
export function renderProjectBenchText(projects) {
  const b = projectBench(projects);
  const lines = [
    "PROJECT BENCH (read-only; per-project result derived from each project's run timeline)",
    `Projects: ${b.total}   ` +
      `(${STATUS_LABEL.PROVEN}: ${b.by_status.PROVEN} · ${STATUS_LABEL.FAILED}: ${b.by_status.FAILED} · ` +
      `${STATUS_LABEL[UNKNOWN]}: ${b.by_status[UNKNOWN]})`,
    `Regressed (worked before, broken now): ${b.regressed}   Recovered: ${b.recovered}`,
  ];
  if (b.protected > 0) lines.push(`Protected (name hidden): ${b.protected}`);
  if (b.items.length === 0) lines.push("  No projects recorded.");
  for (const it of b.items) lines.push("", recordText(it));
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

// A result pill — class carries the colour; the label is the founder-readable word. FAIL is
// the only place red is used (a real problem); PASS is green, UNKNOWN is calm purple.
function resultPill(result) {
  return `<span class="fg-pill fg-pill-${escapeHtml(result)}">${escapeHtml(RESULT_LABEL[result])}</span>`;
}

// Render one ALREADY-DERIVED record as an HTML card. Internal, for the same reason as
// recordText: the bench renderer must format records it already holds, never re-derive them.
function recordHtml(r) {
  const badges = [];
  if (r.regression) {
    badges.push(`<span class="fg-badge fg-badge-regress">Regressed</span>`);
  } else if (r.recovered) {
    badges.push(`<span class="fg-badge fg-badge-recover">Recovered</span>`);
  }
  if (r.status === "PROVEN" && r.pass_streak > 0) {
    badges.push(`<span class="fg-badge fg-badge-streak">${escapeHtml(String(r.pass_streak))} in a row</span>`);
  }
  const rows = r.runs.map((run) =>
    `      <li class="fg-run">${resultPill(run.result)}` +
    `<span class="fg-run-id">${escapeHtml(run.run_id)}</span>` +
    `<span class="fg-meta">${escapeHtml(run.at)}</span></li>`,
  );
  const deliv = r.deliverables.total
    ? `${r.deliverables.proven}/${r.deliverables.total} deliverables proven`
    : "no deliverables recorded";
  const cls = r.protected ? " fg-proj-protected" : "";
  return [
    `<section class="fg-proj${cls}" aria-readonly="true">`,
    `  <div class="fg-proj-head">`,
    `    <span class="fg-pill fg-pill-${escapeHtml(r.current)}">${escapeHtml(STATUS_LABEL[r.status])}</span>`,
    `    <span class="fg-proj-name">${escapeHtml(r.name)}</span>`,
    `    <span class="fg-proj-id">${escapeHtml(r.id)}</span>`,
    ...(badges.length ? [`    ${badges.join("")}`] : []),
    `  </div>`,
    `  <p class="fg-note">${escapeHtml(r.runs_total)} runs · ${escapeHtml(deliv)}</p>`,
    `  <ul class="fg-list">`,
    ...(rows.length ? rows : [`      <li class="fg-empty">No runs recorded — result is unknown, not assumed.</li>`]),
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

// A single project's card (public): derive the raw project, then format it. A protected
// project's name is redacted in the record, so it never reaches the clear here.
export function renderProjectRecordHtml(project) {
  return recordHtml(projectRecord(project));
}

// The full per-project bench as an HTML fragment: an at-a-glance stat row (regressions get
// their own tile so bad news is never buried) followed by one card per project.
export function renderProjectBenchHtml(projects) {
  const b = projectBench(projects);
  const cards = [
    statCard("Projects", b.total, "fg-stat-total"),
    statCard("Proven", b.by_status.PROVEN, "fg-stat-done"),
    statCard("Failed", b.by_status.FAILED, "fg-stat-fail"),
    statCard("Unknown", b.by_status[UNKNOWN], "fg-stat-unknown"),
    statCard("Regressed", b.regressed, b.regressed > 0 ? "fg-stat-fail" : "fg-stat-total"),
  ];
  if (b.protected > 0) cards.push(statCard("Protected", b.protected, "fg-stat-protected"));
  const projectCards = b.items.map((it) => indent(recordHtml(it)));
  return [
    `<section class="fg-card" aria-readonly="true">`,
    `  <h2>Project bench</h2>`,
    `  <p class="fg-note">Each project's result is DERIVED from its run timeline — the latest run wins. A project that passed and later broke is shown as regressed, not quietly counted as proven. A protected project's name is hidden; its result and history stay visible because a result is a fact, not private content.</p>`,
    `  <div class="fg-stat-row">`,
    ...cards,
    `  </div>`,
    ...(projectCards.length ? projectCards : [`  <p class="fg-empty">No projects recorded.</p>`]),
    `</section>`,
  ].join("\n");
}

// The self-contained style for the project-bench surface. Inlined (not a linked stylesheet)
// so the rendered page is a PORTABLE evidence artifact. Shares the founder palette with the
// sibling Bench surface. Style only — a <style> block cannot act. Colour law: green = proven,
// calm purple = unknown/protected, amber = a streak, and RED is reserved for FAIL / regression.
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
    .fg-proj{background:var(--panel2);border:1px solid var(--line);border-radius:10px;
      padding:14px 16px;margin:0 0 12px}
    .fg-proj-protected{border-style:dashed}
    .fg-proj-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .fg-proj-name{font-weight:600}
    .fg-proj-id{color:var(--dim);font-size:12.5px}
    .fg-badge{font-size:11px;text-transform:uppercase;letter-spacing:.05em;border-radius:999px;padding:1px 8px}
    .fg-badge-regress{color:var(--red);border:1px solid rgba(248,113,113,.5)}
    .fg-badge-recover{color:var(--green);border:1px solid rgba(34,197,94,.4)}
    .fg-badge-streak{color:var(--amber);border:1px solid rgba(245,184,61,.4)}
    .fg-list{list-style:none;margin:0;padding:0}
    .fg-run{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:8px;
      padding:8px 10px;margin:0 0 6px;background:var(--panel)}
    .fg-run-id{font-weight:600;font-size:13px}
    .fg-pill{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
      border-radius:999px;padding:1px 8px;white-space:nowrap}
    .fg-pill-PASS{color:var(--green);border:1px solid rgba(34,197,94,.4)}
    .fg-pill-FAIL{color:var(--red);border:1px solid rgba(248,113,113,.45)}
    .fg-pill-UNKNOWN{color:var(--purple);border:1px solid rgba(167,139,250,.4)}
    .fg-meta{color:var(--muted);font-size:12.5px;margin-left:auto;text-align:right}
    .fg-empty{color:var(--muted)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

function indent(block) {
  return block.split("\n").map((l) => (l === "" ? l : `    ${l}`)).join("\n");
}

// renderProjectBenchSurfaceHtml(projects) -> a COMPLETE, self-contained founder-readable page.
// Pure: same snapshot in, byte-identical page out (no clock, no randomness). It carries NO
// <script>, <form>, <button>, <input>, on* handler, or navigable link — the page is observably
// read-only. Data-class redaction flows through: a protected project's name never appears in
// the clear on this surface either.
export function renderProjectBenchSurfaceHtml(projects) {
  const b = projectBench(projects);
  const h = b.headline;
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Project Bench — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Project Bench</h1>`,
    `    <p class="fg-sub">A per-project result ledger. Each project's result is derived from its own run history — the latest run wins — so a project that passed once and later broke shows as regressed, never quietly counted as proven. This surface only shows results — it approves nothing, runs nothing, and sends nothing.</p>`,
    `    <div class="fg-card">`,
    `      <h2>At a glance</h2>`,
    `      <div class="fg-stat-row">`,
    statCard("Projects", h.projects_total, "fg-stat-total"),
    statCard("Proven", h.projects_proven, "fg-stat-done"),
    statCard("Regressed", h.projects_regressed, h.projects_regressed > 0 ? "fg-stat-fail" : "fg-stat-total"),
    `      </div>`,
    `    </div>`,
    indent(renderProjectBenchHtml(projects)),
    `    <p class="fg-foot">Read-only view · the act edge (approve / run / merge) is not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}
