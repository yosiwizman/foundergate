// FounderGate V8-B VB2 — FOUNDER HAND-BURDEN SCORE (read-only, NON-EXECUTING).
//
// Plain English: Bench v1 already tells the founder how many technical operations a run cost
// them (`hand_ops`) and gives a binary verdict — ZERO or PRESENT. That count is honest but it
// is NOT a score, and it hides two things the founder actually wants to know:
//   1. "zero hand-ops" is minted whenever the founder happened to touch nothing — EVEN IF the
//      harness itself also did nothing. A run where nobody did any work looks identical to a
//      run where the harness carried a hundred operations autonomously. A count cannot tell a
//      triumphant autonomous run apart from an empty one.
//   2. A single number in isolation says nothing about DIRECTION OF TRAVEL. The whole point of
//      a hand-burden metric is to watch it fall to zero over successive runs. One count can't
//      show a trend; a founder cannot see "this is getting better" or "this regressed".
//
// FOUNDER HAND-BURDEN SCORE is the scoring layer that closes both gaps:
//   1. A per-run AUTONOMY SCORE (0..100, higher = LESS founder hand-work) — the share of the
//      run's technical operations the HARNESS carried instead of the founder. It is a RATIO, so
//      it refuses to exist without proof of BOTH sides: it is UNKNOWN unless the founder's
//      hand-ops AND the harness's autonomous operations are both measured. Crucially, a run with
//      NO recorded operations at all scores UNKNOWN — never a flattering 100 — because autonomy
//      you cannot prove is not autonomy (Law 54). "Zero hand-ops" alone never mints a triumph.
//   2. A LIVE SCORING SURFACE across the run history: latest / best / worst / average score, and
//      — the number that matters most — the TREND between the two most recent scored runs. A
//      REGRESSION (score fell → founder hand-burden ROSE) is raised as its own headline, the way
//      Project Bench raises a project regression.
//
// This module is that scorer — and NOTHING ELSE:
//   - It is PURE and read-only: every function takes snapshots the caller supplies and RETURNS a
//     plain object or a STRING. It never acts, approves, runs, merges, or executes anything, and
//     it never reads the disk to find metrics itself.
//   - NO side effects: no fs, no network, no child_process, no clock, no randomness. The run
//     order is the order the CALLER supplies (oldest → newest); a run's timestamp is inert DATA
//     displayed verbatim, never parsed and never compared against a system clock. VB2 never
//     invents state — an absent metric makes the score UNKNOWN, never silently 0 or 100.
//   - It REUSES the frozen burden law, it does not fork it: the raw burden digest (hand-ops,
//     avoided burden, direction-vs-burden distinction) comes from the sibling Bench module. This
//     module adds ONLY the scoring arithmetic on top of that frozen digest.
//   - It carries NO act edge and NO action affordance: the rendered page has no <script>,
//     <form>, <button>, <input>, on* handler, or navigable link. Scoring a run is not acting on
//     it — the act edge (approve / run / merge) stays frozen to VB3.
//
// Honesty over flattery: a higher score is a stronger CLAIM, so it needs stronger proof. The
// score is UNKNOWN unless every input behind it is present, and an empty run (no operations at
// all) is UNSCORED, never awarded a perfect autonomy score it did not earn.

import { UNKNOWN } from "./cto-queue.mjs";
import { burdenDigest } from "./bench.mjs";

export const HAND_BURDEN_SCORE_VERSION = "1.0.0";

// The autonomy bands a numeric score falls into, worst → best. UNKNOWN is a first-class, honest
// value — a run whose score cannot be computed is UNSCORED, never dropped into a real band.
export const SCORE_BAND = Object.freeze([
  "FOUNDER_CARRIED_ALL", // score 0 — every recorded operation was the founder's own hand-work
  "FOUNDER_OPERATED",    // 1..49  — the founder still carried most of the hands-on operations
  "ASSISTED",            // 50..79 — the harness carried the majority; the founder still had to help
  "NEAR_AUTONOMOUS",     // 80..99 — the harness carried almost everything
  "FULLY_AUTONOMOUS",    // 100    — the founder performed zero hand-ops AND autonomous work is proven
  UNKNOWN,               // score could not be computed from the supplied metrics
]);

const BAND_LABEL = Object.freeze({
  FOUNDER_CARRIED_ALL: "Founder carried all hands-on work",
  FOUNDER_OPERATED: "Founder-operated",
  ASSISTED: "Assisted",
  NEAR_AUTONOMOUS: "Near-autonomous",
  FULLY_AUTONOMOUS: "Fully autonomous",
  [UNKNOWN]: "Unscored (incomplete metrics)",
});

// The direction of travel between the two most recent SCORED runs. IMPROVING means the score
// rose (founder hand-burden FELL); REGRESSING means the score fell (hand-burden ROSE) — the
// single most important thing for a founder to see. UNKNOWN when fewer than two runs are scored.
export const TREND = Object.freeze(["IMPROVING", "FLAT", "REGRESSING", UNKNOWN]);

const TREND_LABEL = Object.freeze({
  IMPROVING: "Improving — founder hand-burden falling",
  FLAT: "Flat — founder hand-burden unchanged",
  REGRESSING: "Regressing — founder hand-burden rising",
  [UNKNOWN]: "Trend unknown (need two scored runs)",
});

// A non-negative finite number, or UNKNOWN. A missing/garbage/negative value is UNKNOWN — never
// coerced to 0, because 0 is a real claim ("none") and we must not fake it (Law 54).
function num(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : UNKNOWN;
}

// A sum that stays honest: if ANY input is UNKNOWN the whole sum is UNKNOWN. A total is only
// trustworthy when every part of it is known.
function sumOrUnknown(vals) {
  let total = 0;
  for (const v of vals) {
    if (v === UNKNOWN) return UNKNOWN;
    total += v;
  }
  return total;
}

function asId(v) {
  return v == null ? UNKNOWN : String(v);
}

// The band a numeric score falls into. UNKNOWN score → UNKNOWN band (never a real band).
function bandFor(score) {
  if (score === UNKNOWN) return UNKNOWN;
  if (score >= 100) return "FULLY_AUTONOMOUS";
  if (score >= 80) return "NEAR_AUTONOMOUS";
  if (score >= 50) return "ASSISTED";
  if (score >= 1) return "FOUNDER_OPERATED";
  return "FOUNDER_CARRIED_ALL";
}

// scoreRun(metrics) -> the PURE per-run Founder Hand-Burden score derived from ONE run's burden
// metrics. It composes the FROZEN bench burden digest and adds only the scoring ratio:
//
//   autonomous_ops = (false gates the harness suppressed) + (routine actions it did on its own)
//   hand_ops       = the founder's own technical operations (from the frozen digest)
//   score          = round(100 * autonomous_ops / (autonomous_ops + hand_ops))
//
// The score is a RATIO and therefore UNKNOWN unless BOTH sides are proven:
//   - hand_ops UNKNOWN (any burden field missing)        -> score UNKNOWN
//   - autonomous_ops UNKNOWN (either avoided metric absent) -> score UNKNOWN
//   - total operations == 0 (nothing recorded at all)    -> score UNKNOWN, NOT 100. A run with no
//     proven work is not a proven-autonomous run; awarding it a perfect score would invent a
//     triumph the metrics do not support (Law 54). This is the honesty catch a raw count misses.
export function scoreRun(metrics) {
  const b = burdenDigest(metrics);
  const hand_ops = b.hand_ops;
  const autonomous_ops = sumOrUnknown([b.gates_suppressed, b.routine_autonomous]);
  let score = UNKNOWN;
  if (hand_ops !== UNKNOWN && autonomous_ops !== UNKNOWN) {
    const total = hand_ops + autonomous_ops;
    // A denominator of 0 means NO operation of any kind was recorded — there is no evidence of
    // autonomy to score. Stay UNKNOWN rather than mint a perfect 100 out of an empty run.
    if (total > 0) score = Math.round((100 * autonomous_ops) / total);
  }
  return {
    score,
    band: bandFor(score),
    hand_ops,
    autonomous_ops,
    verdict: b.verdict, // the frozen raw-burden verdict (ZERO / PRESENT / UNKNOWN), kept for context
    breakdown: b.breakdown,
    direction: b.direction,
    gates_suppressed: b.gates_suppressed,
    routine_autonomous: b.routine_autonomous,
  };
}

// scoreSeries(runs) -> the PURE LIVE SCORING SURFACE across the run history. `runs` is the
// caller's chronological order (oldest → newest); each run is shaped { run_id, at, metrics }. We
// do NOT sort by time (no clock, no timestamp parsing) — the LAST run is the latest by
// construction. Honest aggregation: runs whose score is UNKNOWN are COUNTED (never dropped) but
// excluded from best/worst/average/trend, and that exclusion is stated out loud via `scored`
// vs `total`. `total_hand_ops` is UNKNOWN if ANY run's hand-ops is unknown (an honest sum).
export function scoreSeries(runs) {
  const list = Array.isArray(runs) ? runs : [];
  const items = list.map((r) => {
    const src = r && typeof r === "object" ? r : {};
    const s = scoreRun(src.metrics);
    return Object.freeze({
      run_id: asId(src.run_id),
      at: asId(src.at),
      score: s.score,
      band: s.band,
      hand_ops: s.hand_ops,
      autonomous_ops: s.autonomous_ops,
      verdict: s.verdict,
    });
  });

  const scoredItems = items.filter((it) => it.score !== UNKNOWN);
  const scores = scoredItems.map((it) => it.score);
  const average = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : UNKNOWN;
  const best = scores.length ? Math.max(...scores) : UNKNOWN;
  const worst = scores.length ? Math.min(...scores) : UNKNOWN;
  // The latest run is whatever came last — scored or not. Reporting it honestly (UNKNOWN if the
  // most recent run could not be scored) beats silently skipping back to the last scored run.
  const latest = items.length ? items[items.length - 1].score : UNKNOWN;
  const total_hand_ops = sumOrUnknown(items.map((it) => it.hand_ops));

  // Trend compares the two most recent SCORED runs — an unscored run in between cannot define a
  // direction of travel, so we skip over it rather than guess.
  let trend = UNKNOWN;
  let delta = UNKNOWN;
  if (scoredItems.length >= 2) {
    const prev = scoredItems[scoredItems.length - 2].score;
    const curr = scoredItems[scoredItems.length - 1].score;
    delta = curr - prev;
    trend = delta > 0 ? "IMPROVING" : delta < 0 ? "REGRESSING" : "FLAT";
  }

  return {
    total: list.length,
    scored: scoredItems.length,
    latest,
    latest_band: bandFor(latest),
    best,
    worst,
    average,
    trend,
    delta,
    regressed: trend === "REGRESSING",
    total_hand_ops,
    items: Object.freeze(items),
  };
}

// handBurdenScore({runs}) -> the whole scoring surface in one PURE object: the scored series and
// a one-glance headline. A missing/blank input degrades to an empty, honestly-UNKNOWN series
// rather than throwing.
export function handBurdenScore(input) {
  const src = input && typeof input === "object" ? input : {};
  const series = scoreSeries(src.runs);
  return {
    series,
    headline: {
      latest_score: series.latest,
      latest_band: series.latest_band,
      average_score: series.average,
      trend: series.trend,
      runs_scored: series.scored,
      runs_total: series.total,
      total_hand_ops: series.total_hand_ops,
    },
  };
}

// ── text renderers ──────────────────────────────────────────────────────────────────────────

function showNum(v) {
  return v === UNKNOWN ? "—" : String(v);
}

function showScore(v) {
  return v === UNKNOWN ? "—" : `${v}/100`;
}

function showDelta(v) {
  if (v === UNKNOWN) return "—";
  return v > 0 ? `+${v}` : String(v);
}

export function renderScoreText(metrics) {
  const s = scoreRun(metrics);
  return [
    "FOUNDER HAND-BURDEN SCORE — single run (read-only; higher score = less founder hand-work)",
    `Autonomy score: ${showScore(s.score)}  →  ${BAND_LABEL[s.band]}`,
    `  Founder hand-operations: ${showNum(s.hand_ops)} · ` +
      `Harness-carried operations: ${showNum(s.autonomous_ops)} ` +
      `(false gates suppressed ${showNum(s.gates_suppressed)} + routine done autonomously ${showNum(s.routine_autonomous)})`,
  ].join("\n");
}

export function renderSeriesText(input) {
  const { series: d, headline: h } = handBurdenScore(input);
  const lines = [
    "FOUNDER HAND-BURDEN SCORE — run history (read-only; scores results, takes no action)",
    `Latest: ${showScore(h.latest_score)} (${BAND_LABEL[h.latest_band]})   ` +
      `Average: ${showScore(d.average)}   Best: ${showScore(d.best)}   Worst: ${showScore(d.worst)}`,
    `Trend: ${TREND_LABEL[d.trend]} (${showDelta(d.delta)})`,
    `Runs scored: ${d.scored}/${d.total}   Total founder hand-operations: ${showNum(d.total_hand_ops)}`,
  ];
  for (const it of d.items) {
    lines.push(
      `  [${BAND_LABEL[it.band]}] ${it.run_id} — score ${showScore(it.score)} ` +
        `(hand-ops ${showNum(it.hand_ops)}, autonomous ${showNum(it.autonomous_ops)}) · ${it.at}`,
    );
  }
  return lines.join("\n");
}

// ── html renderers ──────────────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// The colour a band or trend earns: green when the harness carried the work, red only for a real
// problem (the founder carried everything, or the score regressed), calm purple for UNSCORED.
function bandStatClass(band) {
  if (band === "FULLY_AUTONOMOUS" || band === "NEAR_AUTONOMOUS") return "fg-stat-done";
  if (band === "ASSISTED") return "fg-stat-attention";
  if (band === "FOUNDER_OPERATED" || band === "FOUNDER_CARRIED_ALL") return "fg-stat-fail";
  return "fg-stat-unknown";
}

function trendStatClass(trend) {
  if (trend === "IMPROVING") return "fg-stat-done";
  if (trend === "REGRESSING") return "fg-stat-fail";
  if (trend === "FLAT") return "fg-stat-attention";
  return "fg-stat-unknown";
}

function statCard(label, value, cls) {
  return (
    `    <div class="fg-stat ${cls}">` +
    `<span class="fg-stat-value">${escapeHtml(value)}</span>` +
    `<span class="fg-stat-label">${escapeHtml(label)}</span>` +
    `</div>`
  );
}

function bandPill(band) {
  return `<span class="fg-pill fg-pill-${escapeHtml(band)}">${escapeHtml(BAND_LABEL[band])}</span>`;
}

export function renderScoreHtml(metrics) {
  const s = scoreRun(metrics);
  return [
    `<section class="fg-card" aria-readonly="true">`,
    `  <h2>Latest run score</h2>`,
    `  <p class="fg-note">The share of this run's technical operations the harness carried instead of the founder. Higher is better; a run with no recorded work is left unscored, never awarded a perfect score it did not earn.</p>`,
    `  <div class="fg-stat-row">`,
    statCard("Autonomy score", showScore(s.score), bandStatClass(s.band)),
    statCard("Founder hand-operations", showNum(s.hand_ops), "fg-stat-total"),
    statCard("Harness-carried operations", showNum(s.autonomous_ops), "fg-stat-total"),
    `  </div>`,
    `  <p class="fg-verdict fg-verdict-${escapeHtml(s.band)}">${escapeHtml(BAND_LABEL[s.band])}</p>`,
    `</section>`,
  ].join("\n");
}

export function renderSeriesHtml(input) {
  const { series: d, headline: h } = handBurdenScore(input);
  const rows = d.items.map((it) => {
    const meta = `hand-ops ${showNum(it.hand_ops)} · autonomous ${showNum(it.autonomous_ops)} · ${escapeHtml(it.at)}`;
    return (
      `      <li class="fg-row">` +
      `${bandPill(it.band)}` +
      `<span class="fg-name">${escapeHtml(it.run_id)}</span>` +
      `<span class="fg-meta">${escapeHtml(showScore(it.score))} · ${meta}</span>` +
      `</li>`
    );
  });
  return [
    `<section class="fg-card" aria-readonly="true">`,
    `  <h2>Score history</h2>`,
    `  <p class="fg-note">The founder hand-burden score across every recorded run, oldest to newest. A run that could not be scored is shown as unscored — never dropped and never guessed. The trend is the direction the last two scored runs moved.</p>`,
    `  <div class="fg-stat-row">`,
    statCard("Latest", showScore(h.latest_score), bandStatClass(h.latest_band)),
    statCard("Average", showScore(d.average), "fg-stat-total"),
    statCard("Best", showScore(d.best), "fg-stat-done"),
    statCard("Worst", showScore(d.worst), "fg-stat-total"),
    statCard("Trend", showDelta(d.delta), trendStatClass(d.trend)),
    `  </div>`,
    `  <p class="fg-verdict fg-verdict-trend-${escapeHtml(d.trend)}">${escapeHtml(TREND_LABEL[d.trend])}</p>`,
    `  <p class="fg-note">Runs scored: ${escapeHtml(String(d.scored))} of ${escapeHtml(String(d.total))} · total founder hand-operations: ${escapeHtml(showNum(d.total_hand_ops))}</p>`,
    `  <ul class="fg-list">`,
    ...(rows.length ? rows : [`      <li class="fg-empty">No runs recorded.</li>`]),
    `  </ul>`,
    `</section>`,
  ].join("\n");
}

// The self-contained style for the score surface. Inlined (not a linked stylesheet) so the
// rendered page is a PORTABLE evidence artifact that stands alone. Shares the founder palette
// with the sibling Bench surface for visual kinship. Style only — no behaviour; a <style> block
// cannot act. Colour law honoured: green = autonomous/improving, calm purple = unscored, amber =
// attention (assisted / flat), and RED is reserved for a real problem (founder-operated / regression).
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
    .fg-stat-attention .fg-stat-value{color:var(--amber)}
    .fg-stat-unknown .fg-stat-value{color:var(--purple)}
    .fg-list{list-style:none;margin:0;padding:0}
    .fg-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;
      padding:10px 12px;margin:0 0 8px;background:var(--panel2)}
    .fg-pill{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
      border-radius:999px;padding:1px 8px;white-space:nowrap}
    .fg-pill-FULLY_AUTONOMOUS,.fg-pill-NEAR_AUTONOMOUS{color:var(--green);border:1px solid rgba(34,197,94,.4)}
    .fg-pill-ASSISTED{color:var(--amber);border:1px solid rgba(245,184,61,.4)}
    .fg-pill-FOUNDER_OPERATED,.fg-pill-FOUNDER_CARRIED_ALL{color:var(--red);border:1px solid rgba(248,113,113,.45)}
    .fg-pill-UNKNOWN{color:var(--purple);border:1px solid rgba(167,139,250,.4)}
    .fg-name{font-weight:600}
    .fg-meta{color:var(--muted);font-size:12.5px;margin-left:auto;text-align:right}
    .fg-verdict{font-weight:600;margin:.2em 0 12px}
    .fg-verdict-FULLY_AUTONOMOUS,.fg-verdict-NEAR_AUTONOMOUS,.fg-verdict-trend-IMPROVING{color:var(--green)}
    .fg-verdict-ASSISTED,.fg-verdict-trend-FLAT{color:var(--amber)}
    .fg-verdict-FOUNDER_OPERATED,.fg-verdict-FOUNDER_CARRIED_ALL,.fg-verdict-trend-REGRESSING{color:var(--red)}
    .fg-verdict-UNKNOWN,.fg-verdict-trend-UNKNOWN{color:var(--purple)}
    .fg-empty{color:var(--muted)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

function indent(block) {
  return block.split("\n").map((l) => (l === "" ? l : `    ${l}`)).join("\n");
}

// renderSurfaceHtml(input) -> a COMPLETE, self-contained founder-readable page. `input` is the
// {runs} snapshot. Pure: same snapshot in, byte-identical page out (no clock, no randomness). It
// carries NO <script>, <form>, <button>, <input>, on* handler, or navigable link — the page is
// observably read-only. Scoring is not acting.
export function renderSurfaceHtml(input) {
  const src = input && typeof input === "object" ? input : {};
  const { series: d, headline: h } = handBurdenScore(src);
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>Founder hand-burden score — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>Founder hand-burden score</h1>`,
    `    <p class="fg-sub">How much hands-on technical work each run cost you, scored 0–100 where a higher score means less founder hand-work, and how that score is trending across runs. This surface only scores results — it approves nothing, runs nothing, and sends nothing.</p>`,
    `    <div class="fg-card">`,
    `      <h2>At a glance</h2>`,
    `      <div class="fg-stat-row">`,
    statCard("Latest score", showScore(h.latest_score), bandStatClass(h.latest_band)),
    statCard("Average score", showScore(h.average_score), "fg-stat-total"),
    statCard("Trend", showDelta(d.delta), trendStatClass(h.trend)),
    statCard("Runs scored", `${h.runs_scored}/${h.runs_total}`, "fg-stat-total"),
    `      </div>`,
    `      <p class="fg-verdict fg-verdict-trend-${escapeHtml(h.trend)}">${escapeHtml(TREND_LABEL[h.trend])}</p>`,
    `    </div>`,
    indent(renderScoreHtml(latestMetrics(src))),
    indent(renderSeriesHtml(src)),
    `    <p class="fg-foot">Read-only view · the act edge (approve / run / merge) is not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

// The metrics of the most recent run in the series (or undefined if there are none) — so the
// single-run score card on the surface reflects the latest run, honestly UNKNOWN when absent.
function latestMetrics(src) {
  const runs = Array.isArray(src.runs) ? src.runs : [];
  const last = runs.length ? runs[runs.length - 1] : null;
  return last && typeof last === "object" ? last.metrics : undefined;
}

// renderSurfaceText(input) -> plain-text score surface (latest run + history). Pure. Useful for a
// terminal/log rendering and for tests that assert content without HTML.
export function renderSurfaceText(input) {
  const src = input && typeof input === "object" ? input : {};
  return [
    "FOUNDER HAND-BURDEN SCORE — SUMMARY (read-only; scores results, takes no action)",
    "",
    renderScoreText(latestMetrics(src)),
    "",
    renderSeriesText(src),
  ].join("\n");
}
