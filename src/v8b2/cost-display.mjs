// FounderGate V8-B VB2 — COST DISPLAY surface (read-only, NON-EXECUTING).
//
// Plain English: the V8-B completion matrix marks **"Cost display" = PARTIAL**, with only the
// `cost_budget` schema on disk and the missing behaviour named as a
// **"per-run / quota / cost-per-PR display"**. FounderGate already carries a declared cost
// budget (`.foundergate/cost_budget.json` — a monthly USD limit, whether paid services are
// blocked, and the same-failure-loop policy), and the V8-A1 dashboard shows that limit as a
// single number. What the founder still lacks is a dedicated surface that lays the whole cost
// picture out: the declared QUOTA, the spend PER RUN, and the spend PER PR — one place to read
// "what am I allowed to spend, and what has each run / PR actually cost me?"
//
// This module is that surface — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes a caller-supplied cost snapshot and
//     RETURNS a plain object or a STRING. It never reads the disk to find costs itself, never
//     opens the network, never acts, approves, runs, merges, or dispatches anything.
//   - NO side effects: no fs, no net, no child_process, no clock, no randomness. Same snapshot
//     in → byte-identical page out. A run's timestamp is inert DATA shown verbatim, never
//     parsed and never compared against a system clock.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>,
//     <form>, <button>, <input>, on* handler, or navigable link (<a href>). There is nothing
//     here to raise or lower a budget, cancel a run, or spend a dollar — this surface only
//     SHOWS cost. The cost GUARD (runtime enforcement) is a later, separately-gated engine; it
//     is not wired here.
//
// THE HONESTY STANCE — the heart of a "cost" surface (Law 54: never invent state):
//   FounderGate's cost budget is declared `enforcement: "policy-display-only"` — the limit is
//   DISPLAYED, not yet ENFORCED, and actual spend is not yet metered by the harness. So this
//   surface refuses to fabricate money:
//     - A run or PR with no RECORDED cost is "not measured" — it is NEVER guessed to be $0.00.
//       An unmeasured cost silently rendered as zero is the most seductive cost lie there is.
//     - The total spend sums ONLY measured costs; when any run is unmeasured the total is
//       flagged PARTIAL (the true spend is at least this much, possibly more) — never presented
//       as a complete figure.
//     - "Within budget" is asserted ONLY when EVERY run is measured AND the complete total sits
//       under a declared limit. A partial total can only ever say "at least X% of budget so
//       far", never a clean green "within budget".
//     - No monthly limit is invented: a snapshot with no declared limit says "no limit declared"
//       out loud rather than assume unlimited or assume zero.
//     - The `enforcement` label is carried verbatim to the top of the page, so a founder always
//       knows the budget is DISPLAYED, not policed.
//   TRUTH LABELLING: the snapshot's `source` ("live" vs "fixture") is carried to the page and
//   never conflated — a founder always knows whether they read live meter data or a committed
//   sample.

import { UNKNOWN } from "./cto-queue.mjs";

export const COST_DISPLAY_VERSION = "1.0.0";

// The enforcement value we recognise. Anything else is shown verbatim (escaped), never mapped
// to a friendlier meaning it does not have.
export const KNOWN_ENFORCEMENT = "policy-display-only";

// A trimmed string, or "" — never a coerced object/number pretending to be text.
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

// A non-negative MONEY amount, or null when it cannot be read. null means "not measured", said
// out loud — it is NEVER coerced to 0 (Law 54). Fractions are allowed (a cost is not an int).
function moneyOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}

// A non-negative integer, or null. Same honesty: null is "not declared", never guessed to 0.
function intOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

// Deterministic money formatting: always two decimals, no locale, no clock, no separators that
// vary by environment. `$12.50`, `$0.00`, and — for an absent amount — the honest word, never
// a fabricated "$0.00".
export function fmtMoney(amount) {
  return typeof amount === "number" && Number.isFinite(amount) && amount >= 0
    ? `$${amount.toFixed(2)}`
    : "not measured";
}

// deriveBudget(budget) -> a PURE, frozen view of the declared quota. Never invents a limit and
// never softens the enforcement label.
function deriveBudget(budget) {
  const b = budget && typeof budget === "object" ? budget : null;
  if (!b) {
    return Object.freeze({
      declared: false,
      schemaVersion: null,
      enforcement: UNKNOWN,
      enforcementIsDisplayOnly: false,
      monthlyLimitUsd: null,
      paidServicesBlocked: null,
      sameFailureLoopPolicy: null,
    });
  }
  const enforcement = str(b.enforcement) || UNKNOWN;
  return Object.freeze({
    declared: true,
    schemaVersion: str(b.schema_version) || null,
    enforcement,
    enforcementIsDisplayOnly: enforcement === KNOWN_ENFORCEMENT,
    monthlyLimitUsd: moneyOrNull(b.monthly_limit_usd),
    paidServicesBlocked:
      typeof b.paid_services_blocked === "boolean" ? b.paid_services_blocked : null,
    sameFailureLoopPolicy: str(b.same_failure_loop_policy) || null,
  });
}

// deriveCostView(snapshot) -> a PURE, frozen cost view over a caller-supplied snapshot. It never
// mutates the input, never invents a cost, and marks every unmeasured amount out loud. A
// non-object / missing snapshot degrades to an honest, empty view.
export function deriveCostView(snapshot) {
  const s = snapshot && typeof snapshot === "object" ? snapshot : {};
  const source = s.source === "live" ? "live" : s.source === "fixture" ? "fixture" : UNKNOWN;
  const budget = deriveBudget(s.budget);

  const rawRuns = Array.isArray(s.runs) ? s.runs : [];
  const runs = rawRuns.map((run) => {
    const r = run && typeof run === "object" ? run : {};
    const runCost = moneyOrNull(r.cost_usd);
    const rawPrs = Array.isArray(r.prs) ? r.prs : [];
    const prs = rawPrs.map((pr) => {
      const p = pr && typeof pr === "object" ? pr : {};
      const cost = moneyOrNull(p.cost_usd);
      return Object.freeze({
        number: Number.isInteger(p.number) && p.number > 0 ? p.number : null,
        title: str(p.title) || UNKNOWN,
        cost, // number | null (null = not measured, NEVER 0)
        costMeasured: cost !== null,
      });
    });
    const measuredPrCost = prs.reduce((sum, p) => (p.cost !== null ? sum + p.cost : sum), 0);
    const measuredPrCount = prs.filter((p) => p.costMeasured).length;
    return Object.freeze({
      id: str(r.id) || null,
      label: str(r.label) || UNKNOWN,
      startedAt: str(r.startedAt) || null,
      cost: runCost, // number | null (null = not measured, NEVER 0)
      costMeasured: runCost !== null,
      prs: Object.freeze(prs),
      prCount: prs.length,
      measuredPrCount,
      allPrsMeasured: prs.length > 0 && measuredPrCount === prs.length,
      measuredPrCost, // sum of ONLY measured PR costs
    });
  });

  const totalRunCount = runs.length;
  const measuredRunCount = runs.filter((r) => r.costMeasured).length;
  // The total sums ONLY measured run costs. When any run is unmeasured this figure is a FLOOR,
  // never a complete total — the `totalIsPartial` flag says so and the UI must not hide it.
  const totalMeasuredSpend = runs.reduce((sum, r) => (r.cost !== null ? sum + r.cost : sum), 0);
  const allRunsMeasured = totalRunCount > 0 && measuredRunCount === totalRunCount;
  const totalIsPartial = totalRunCount > 0 && !allRunsMeasured;

  // Any measured cost anywhere (run or PR) means spend tracking has produced at least one real
  // figure. With none, spend tracking is simply not enabled — said out loud, not implied as $0.
  const anyMeasured =
    measuredRunCount > 0 || runs.some((r) => r.measuredPrCount > 0);
  const spendTracking = anyMeasured ? "measured" : "not-enabled";

  const limit = budget.monthlyLimitUsd;
  // Budget status is derived with maximum honesty:
  //   - no limit declared            -> "no-limit"
  //   - no measured spend at all      -> "unmeasured"
  //   - measured but total is partial -> "partial" (can only say "at least X% so far")
  //   - complete total, under limit   -> "within" (the only clean green)
  //   - complete total, over limit    -> "over"
  let budgetStatus;
  let percentOfLimit = null; // number | null — % of the declared limit the MEASURED spend is
  if (limit === null) {
    budgetStatus = "no-limit";
  } else {
    percentOfLimit = limit > 0 ? (totalMeasuredSpend / limit) * 100 : null;
    if (!anyMeasured) budgetStatus = "unmeasured";
    else if (totalIsPartial) budgetStatus = "partial";
    else budgetStatus = totalMeasuredSpend <= limit ? "within" : "over";
  }

  return Object.freeze({
    version: COST_DISPLAY_VERSION,
    source,
    collectedAt: str(s.collectedAt) || null,
    readOnly: true,
    budget,
    spendTracking, // "measured" | "not-enabled"
    runs: Object.freeze(runs),
    totalRunCount,
    measuredRunCount,
    totalMeasuredSpend,
    totalIsPartial,
    allRunsMeasured,
    budgetStatus, // "no-limit" | "unmeasured" | "partial" | "within" | "over"
    percentOfLimit,
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const SOURCE_LABEL = Object.freeze({
  live: "Live cost meter",
  fixture: "Fixture (committed sample — not live)",
  [UNKNOWN]: "Unknown source",
});

// Plain-English, honest phrasing for each budget status. No status ever reads greener than the
// evidence supports.
const BUDGET_STATUS = Object.freeze({
  "no-limit": { tone: "muted", text: "No monthly limit declared" },
  unmeasured: { tone: "muted", text: "Spend not measured — cannot compare to the limit" },
  partial: { tone: "warn", text: "Partial spend only — some runs are not measured" },
  within: { tone: "ok", text: "Within the declared monthly limit" },
  over: { tone: "bad", text: "Over the declared monthly limit" },
});

// A percent string only when it is honest to show one. Partial totals say "at least"; a clean
// complete total shows the exact figure.
function percentLine(v) {
  if (v.percentOfLimit === null) return null;
  const pct = `${v.percentOfLimit.toFixed(1)}%`;
  if (v.budgetStatus === "partial") return `at least ${pct} of the monthly limit (spend is only partly measured)`;
  if (v.budgetStatus === "within" || v.budgetStatus === "over") return `${pct} of the monthly limit`;
  return null;
}

// ── Plain-text rendering (terminal/log + tests that assert content without HTML) ─────────────

// renderCostText(snapshot) -> founder-readable plain text of the whole surface. Pure.
export function renderCostText(snapshot) {
  const v = deriveCostView(snapshot);
  const b = v.budget;
  const lines = [
    `COST DISPLAY — read-only; shows spend, changes nothing, spends nothing`,
    `Source: ${SOURCE_LABEL[v.source]}`,
  ];
  if (v.collectedAt) lines.push(`Collected at: ${v.collectedAt}`);
  lines.push("");

  // QUOTA (the declared budget/policy).
  lines.push(`QUOTA (declared budget — DISPLAY ONLY, not enforced by this surface)`);
  if (!b.declared) {
    lines.push(`  (no cost budget declared)`);
  } else {
    lines.push(`  Monthly limit: ${b.monthlyLimitUsd === null ? "no limit declared" : fmtMoney(b.monthlyLimitUsd)}`);
    lines.push(`  Enforcement: ${b.enforcement}${b.enforcementIsDisplayOnly ? " (limit is displayed, not enforced)" : ""}`);
    lines.push(`  Paid services blocked: ${b.paidServicesBlocked === null ? UNKNOWN : b.paidServicesBlocked ? "yes" : "no"}`);
    if (b.sameFailureLoopPolicy) lines.push(`  Same-failure-loop policy: ${b.sameFailureLoopPolicy}`);
  }
  lines.push("");

  // TOTAL / budget status.
  lines.push(`SPEND`);
  if (v.spendTracking === "not-enabled") {
    lines.push(`  Spend tracking is not enabled — no run or PR cost has been measured yet.`);
    lines.push(`  (An unmeasured cost is shown as "not measured", never as a zero-dollar amount.)`);
  } else {
    lines.push(
      `  Measured total: ${fmtMoney(v.totalMeasuredSpend)}${v.totalIsPartial ? "  (PARTIAL — some runs are not measured; true spend is at least this much)" : ""}`
    );
    lines.push(`  Measured runs: ${v.measuredRunCount} of ${v.totalRunCount}`);
  }
  lines.push(`  Budget status: ${BUDGET_STATUS[v.budgetStatus].text}`);
  const pct = percentLine(v);
  if (pct) lines.push(`  ${pct}`);
  lines.push("");

  // PER-RUN + cost-per-PR.
  lines.push(`PER RUN`);
  if (v.runs.length === 0) {
    lines.push(`  (no runs in this snapshot)`);
    return lines.join("\n").replace(/\n+$/, "");
  }
  for (const run of v.runs) {
    lines.push(`  Run ${run.label}${run.startedAt ? ` — started ${run.startedAt}` : ""}`);
    lines.push(`    Run cost: ${run.cost === null ? "not measured" : fmtMoney(run.cost)}`);
    if (run.prs.length === 0) {
      lines.push(`    Cost per PR: (no PRs recorded for this run)`);
    } else {
      lines.push(`    Cost per PR (${run.measuredPrCount} of ${run.prCount} measured):`);
      for (const pr of run.prs) {
        lines.push(`      ${pr.number === null ? "PR" : `#${pr.number}`} ${pr.title} — ${pr.cost === null ? "not measured" : fmtMoney(pr.cost)}`);
      }
    }
  }
  return lines.join("\n").replace(/\n+$/, "");
}

// ── HTML rendering (pure display; no behaviour) ──────────────────────────────────────────────

function chip(text, tone) {
  return `<span class="fg-chip fg-tone-${escapeHtml(tone)}">${escapeHtml(text)}</span>`;
}

// A money cell that shows the amount, or the honest "not measured" (never a fabricated $0.00).
function moneyCell(amount) {
  return amount === null
    ? `<span class="fg-unmeasured">not measured</span>`
    : `<span class="fg-money">${escapeHtml(fmtMoney(amount))}</span>`;
}

function renderQuotaHtml(v) {
  const b = v.budget;
  if (!b.declared) {
    return [
      `  <section class="fg-quota" aria-readonly="true">`,
      `    <h2>Quota</h2>`,
      `    <p class="fg-empty">No cost budget is declared in this snapshot.</p>`,
      `  </section>`,
    ].join("\n");
  }
  const enfChip = chip(
    b.enforcementIsDisplayOnly ? "display only — not enforced" : b.enforcement,
    b.enforcementIsDisplayOnly ? "info" : "warn"
  );
  const paid =
    b.paidServicesBlocked === null
      ? chip("paid services: unknown", "muted")
      : chip(b.paidServicesBlocked ? "paid services blocked" : "paid services allowed", b.paidServicesBlocked ? "ok" : "warn");
  return [
    `  <section class="fg-quota" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Quota</h2>${enfChip}${paid}</div>`,
    `    <div class="fg-big-row">`,
    `      <div class="fg-big"><span class="fg-big-value">${escapeHtml(b.monthlyLimitUsd === null ? "no limit" : fmtMoney(b.monthlyLimitUsd))}</span><span class="fg-big-label">Monthly limit</span></div>`,
    `    </div>`,
    b.monthlyLimitUsd === null
      ? `    <p class="fg-note">No monthly limit is declared — no limit is assumed either way (Law 54).</p>`
      : ``,
    b.sameFailureLoopPolicy
      ? `    <p class="fg-note">Same-failure-loop policy: ${escapeHtml(b.sameFailureLoopPolicy)}</p>`
      : ``,
    `    <p class="fg-note">The budget is <strong>displayed</strong> here, not enforced. This surface shows cost; it changes no limit and spends nothing.</p>`,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderSpendHtml(v) {
  const status = BUDGET_STATUS[v.budgetStatus];
  const pct = percentLine(v);
  const totalCell =
    v.spendTracking === "not-enabled"
      ? `<span class="fg-unmeasured">not measured</span>`
      : `${moneyCell(v.totalMeasuredSpend)}${v.totalIsPartial ? ` <span class="fg-partial">partial</span>` : ""}`;
  return [
    `  <section class="fg-spend" aria-readonly="true">`,
    `    <div class="fg-head-row"><h2>Spend</h2>${chip(status.text, status.tone)}</div>`,
    v.spendTracking === "not-enabled"
      ? `    <p class="fg-note">Spend tracking is not enabled — no run or PR cost has been measured yet. Unmeasured costs are shown as <em>not measured</em>, never as a zero-dollar amount.</p>`
      : ``,
    `    <div class="fg-stat-row">`,
    `      <div class="fg-stat"><span class="fg-stat-value">${totalCell}</span><span class="fg-stat-label">Measured total${v.totalIsPartial ? " (floor)" : ""}</span></div>`,
    `      <div class="fg-stat"><span class="fg-stat-value">${escapeHtml(v.measuredRunCount)} / ${escapeHtml(v.totalRunCount)}</span><span class="fg-stat-label">Runs measured</span></div>`,
    `    </div>`,
    pct ? `    <p class="fg-note">${escapeHtml(pct)}</p>` : ``,
    v.totalIsPartial
      ? `    <p class="fg-note">The total sums only measured runs, so it is a <strong>floor</strong> — the true spend is at least this much. It is never presented as a complete figure.</p>`
      : ``,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

function renderRunHtml(run) {
  const prs =
    run.prs.length === 0
      ? `      <p class="fg-empty">No PRs recorded for this run.</p>`
      : [
          `      <table class="fg-pr-table"><thead><tr><th>PR</th><th>Title</th><th class="fg-num">Cost</th></tr></thead>`,
          `      <tbody>`,
          ...run.prs.map(
            (pr) =>
              `        <tr><td class="fg-pr-num">${pr.number === null ? "PR" : `#${escapeHtml(pr.number)}`}</td><td>${escapeHtml(pr.title)}</td><td class="fg-num">${moneyCell(pr.cost)}</td></tr>`
          ),
          `      </tbody></table>`,
        ].join("\n");
  return [
    `  <section class="fg-run" aria-readonly="true">`,
    `    <div class="fg-run-head">`,
    `      <span class="fg-run-label">${escapeHtml(run.label)}</span>`,
    run.startedAt ? `      <span class="fg-run-time">started ${escapeHtml(run.startedAt)}</span>` : ``,
    `      <span class="fg-run-cost">${moneyCell(run.cost)}</span>`,
    `    </div>`,
    `    <h3>Cost per PR${run.prCount ? ` (${escapeHtml(run.measuredPrCount)} of ${escapeHtml(run.prCount)} measured)` : ""}</h3>`,
    prs,
    `  </section>`,
  ].filter(Boolean).join("\n");
}

// renderCostHtml(snapshot) -> the composed body (quota + spend + one card per run) as an HTML
// fragment. Pure display; no <script>/form/button/input/on*/href.
export function renderCostHtml(snapshot) {
  const v = deriveCostView(snapshot);
  const parts = [renderQuotaHtml(v), renderSpendHtml(v)];
  if (v.runs.length === 0) {
    parts.push(`  <section aria-readonly="true"><p class="fg-empty">No runs in this snapshot.</p></section>`);
  } else {
    for (const run of v.runs) parts.push(renderRunHtml(run));
  }
  return parts.join("\n");
}

// The self-contained style. Inlined so the rendered page is a PORTABLE evidence artifact that
// stands alone, using the shared founder palette for visual kinship with the sibling VB2
// surfaces. Style only — no behaviour. Colour law: red is reserved for a genuine problem
// (over budget); routine and unmeasured states stay calm.
const SURFACE_STYLE = `
    :root{
      --bg:#0d1117;--panel:#161c26;--panel2:#1b2230;--line:#2a3344;
      --text:#e6ebf2;--muted:#93a0b4;--dim:#6b7789;
      --blue:#3b82f6;--green:#22c55e;--amber:#f5b83d;--purple:#a78bfa;--red:#f26d6d;--radius:12px;
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);
      font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
    .fg-wrap{max-width:920px;margin:0 auto;padding:32px 20px 56px}
    .fg-eyebrow{color:var(--purple);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
    h1{font-size:27px;margin:.2em 0 .1em}
    h2{font-size:16px;margin:0}
    h3{font-size:13.5px;margin:16px 0 .3em;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
    .fg-sub{color:var(--muted);margin:0 0 24px}
    .fg-note{color:var(--muted);font-size:12.5px;margin:.4em 0 0}
    .fg-note strong{color:var(--text)}
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-head-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px}
    .fg-chip{font-size:11.5px;border-radius:999px;padding:1px 9px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
    .fg-tone-ok{color:var(--green);border-color:rgba(34,197,94,.4)}
    .fg-tone-bad{color:var(--red);border-color:rgba(242,109,109,.5)}
    .fg-tone-warn{color:var(--amber);border-color:rgba(245,184,61,.45)}
    .fg-tone-info{color:var(--blue);border-color:rgba(59,130,246,.4)}
    .fg-tone-muted{color:var(--muted)}
    .fg-big-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
    .fg-big{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:14px 20px;display:flex;flex-direction:column;gap:2px}
    .fg-big-value{font-size:30px;font-weight:700}
    .fg-big-label{color:var(--muted);font-size:12.5px}
    .fg-stat-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}
    .fg-stat{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;min-width:150px}
    .fg-stat-value{font-size:22px;font-weight:700}
    .fg-stat-label{color:var(--muted);font-size:12.5px}
    .fg-money{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700}
    .fg-unmeasured{color:var(--dim);font-style:italic;font-size:13px}
    .fg-partial{color:var(--amber);font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;margin-left:6px}
    .fg-run-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
    .fg-run-label{font-weight:700;color:var(--purple);font-size:16px}
    .fg-run-time{color:var(--dim);font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fg-run-cost{margin-left:auto;font-size:15px}
    .fg-pr-table{width:100%;border-collapse:collapse;margin-top:4px;font-size:13.5px}
    .fg-pr-table th{text-align:left;color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;padding:4px 8px;border-bottom:1px solid var(--line)}
    .fg-pr-table td{padding:6px 8px;border-bottom:1px solid var(--line)}
    .fg-pr-table tr:last-child td{border-bottom:none}
    .fg-pr-num{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--purple);white-space:nowrap}
    .fg-num{text-align:right;white-space:nowrap}
    .fg-empty{color:var(--muted)}
    code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--text)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(snapshot) -> a COMPLETE, self-contained founder-readable page. Pure: same
// snapshot in, byte-identical page out (no clock, no randomness). It carries NO <script>,
// <form>, <button>, <input>, on* handler, or navigable link (<a href>) — observably read-only.
export function renderSurfaceHtml(snapshot) {
  const v = deriveCostView(snapshot);
  const srcTone = v.source === "live" ? "info" : v.source === "fixture" ? "muted" : "warn";
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Cost Display — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Cost Display</h1>`,
    `    <p class="fg-sub">The declared budget (quota), the spend per run, and the cost per PR — one place to read what this project is allowed to spend and what it has actually cost. Unmeasured costs are shown as <em>not measured</em>, never as a zero-dollar amount. This surface only shows cost; it changes no limit, cancels nothing, and spends nothing.</p>`,
    `    <div class="fg-head-row">${chip(SOURCE_LABEL[v.source], srcTone)}${v.collectedAt ? `<span class="fg-run-time">collected ${escapeHtml(v.collectedAt)}</span>` : ""}</div>`,
    renderCostHtml(snapshot),
    `    <p class="fg-foot">Read-only view · unmeasured cost is never rendered as a zero-dollar amount · the budget is displayed, not enforced · the cost guard (runtime enforcement) is not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// renderSurfaceText(snapshot) -> plain-text dedicated surface. Pure. Convenience alias so callers
// have a symmetric {Html,Text} pair like the other VB2 surfaces.
export function renderSurfaceText(snapshot) {
  return renderCostText(snapshot);
}
