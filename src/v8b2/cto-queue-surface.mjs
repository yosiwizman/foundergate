// FounderGate V8-B VB2 — CTO queue DEDICATED SURFACE (read-only, NON-EXECUTING).
//
// Plain English: the CTO queue already has a data model (cto-queue.mjs) and a read-only
// view shell (queue-view.mjs). What the founder still lacked was a *dedicated surface* —
// one founder-readable page that shows the whole queue at a glance: a plain-English
// summary ("how many are waiting / blocked / done") on top of the routed-item list. This
// module builds that surface and NOTHING ELSE:
//   - It is PURE and read-only: every function takes a queue and RETURNS A STRING or a
//     plain summary object. It never acts, approves, runs, or executes anything.
//   - NO side effects: no fs, no network, no child_process, no clock, no randomness. The
//     digest is DERIVED from the queue the caller supplies — VB2 never invents state
//     (Law 54); an absent status is shown as 0, never guessed.
//   - NO act edge: this module only READS the queue through the frozen data-model API and
//     composes the frozen read-only view. The act edge for anything queued remains VB3.
//   - It carries NO action affordance: the rendered page has no <script>, <form>,
//     <button>, on* handler, or navigable link — there is nothing an interaction can ride.
//
// Honesty over completeness: the digest re-asserts the data-class boundary. Items whose
// data class is not displayable are counted as "protected" and their CONTENT is never
// summarised in the clear — the surface tells the founder "N protected" instead.

import { listItems, isDisplayableClass, STATUS, KIND, UNKNOWN } from "./cto-queue.mjs";
import { renderQueueHtml, renderQueueText } from "./queue-view.mjs";

export const SURFACE_VERSION = "1.0.0";

// Plain-English label per status — read-only presentation, no behaviour. Mirrors the
// view shell's vocabulary so the summary and the list speak the same language.
const STATUS_LABEL = Object.freeze({
  queued: "Waiting",
  blocked: "Blocked",
  done: "Done",
  [UNKNOWN]: "Unknown",
});

// queueDigest(queue) -> a PURE derived summary. Read-only: it lists the queue through the
// frozen accessor and counts. Honest: every status bucket is present and zero-filled, so an
// absent status reads as 0 (never omitted, never guessed — Law 54). A status outside the
// known enum is counted as UNKNOWN rather than invented. `by_kind` covers the known kinds;
// `total` is always the authoritative item count. `protected` counts items whose data class
// is not displayable — their content is never summarised, only tallied.
export function queueDigest(queue) {
  const items = listItems(queue); // read-only; returns a fresh array of frozen records
  const by_status = Object.fromEntries(STATUS.map((s) => [s, 0]));
  const by_kind = Object.fromEntries(KIND.map((k) => [k, 0]));
  let protectedCount = 0;
  for (const it of items) {
    if (Object.prototype.hasOwnProperty.call(by_status, it.status)) by_status[it.status] += 1;
    else by_status[UNKNOWN] += 1; // unknown status said out loud, never invented
    if (Object.prototype.hasOwnProperty.call(by_kind, it.kind)) by_kind[it.kind] += 1;
    if (!isDisplayableClass(it.data_class)) protectedCount += 1;
  }
  return { total: items.length, by_status, by_kind, protected: protectedCount };
}

// renderDigestText(queue) -> string. Founder-readable one-glance summary. Pure.
export function renderDigestText(queue) {
  const d = queueDigest(queue);
  const parts = STATUS.map((s) => `${STATUS_LABEL[s]}: ${d.by_status[s]}`);
  const lines = [
    `CTO QUEUE — SUMMARY (read-only; counts routed items, takes no action)`,
    `Total items: ${d.total}`,
    `  ${parts.join("  ·  ")}`,
  ];
  if (d.protected > 0) {
    lines.push(`  Protected (content hidden): ${d.protected}`);
  }
  return lines.join("\n");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// renderDigestHtml(queue) -> string of HTML. Pure display: a row of stat cards. No
// <script>, no form, no button, no handler, no link — nothing an interaction can ride.
export function renderDigestHtml(queue) {
  const d = queueDigest(queue);
  const cards = [];
  cards.push(statCard("Total", d.total, "fg-stat-total"));
  for (const s of STATUS) {
    cards.push(statCard(STATUS_LABEL[s], d.by_status[s], `fg-stat-${escapeHtml(s)}`));
  }
  if (d.protected > 0) {
    cards.push(statCard("Protected", d.protected, "fg-stat-protected"));
  }
  return [
    `<section class="fg-cto-digest" aria-readonly="true">`,
    `  <h2>Queue summary</h2>`,
    `  <p class="fg-note">A read-only count of what has been routed. Nothing here approves, runs, or sends anything.</p>`,
    `  <div class="fg-stat-row">`,
    ...cards,
    `  </div>`,
    `</section>`,
  ].join("\n");
}

function statCard(label, value, cls) {
  return (
    `    <div class="fg-stat ${cls}">` +
    `<span class="fg-stat-value">${escapeHtml(value)}</span>` +
    `<span class="fg-stat-label">${escapeHtml(label)}</span>` +
    `</div>`
  );
}

// The self-contained style for the dedicated surface. Inlined (not a linked stylesheet) so
// the rendered page is a PORTABLE evidence artifact that stands alone. Uses the shared
// founder palette values from src/ui/tokens.css for visual kinship. Style only — no
// behaviour; a <style> block cannot act. The colour law is honoured: no red is used for
// routine "protected / blocked" states (calm purple lock), red is reserved for problems.
const SURFACE_STYLE = `
    :root{
      --bg:#0d1117;--panel:#161c26;--panel2:#1b2230;--line:#2a3344;
      --text:#e6ebf2;--muted:#93a0b4;--dim:#6b7789;
      --blue:#3b82f6;--green:#22c55e;--amber:#f5b83d;--purple:#a78bfa;--radius:12px;
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
    section{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);
      padding:18px 20px;margin:0 0 20px}
    .fg-stat-row{display:flex;flex-wrap:wrap;gap:12px}
    .fg-stat{flex:1 1 120px;background:var(--panel2);border:1px solid var(--line);
      border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:2px}
    .fg-stat-value{font-size:26px;font-weight:700}
    .fg-stat-label{color:var(--muted);font-size:12.5px}
    .fg-stat-blocked .fg-stat-value{color:var(--amber)}
    .fg-stat-done .fg-stat-value{color:var(--green)}
    .fg-stat-protected .fg-stat-value,.fg-stat-UNKNOWN .fg-stat-value{color:var(--purple)}
    .fg-cto-list{list-style:none;margin:0;padding:0}
    .fg-cto-item{border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:0 0 10px;background:var(--panel2)}
    .fg-status{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
      color:var(--purple);border:1px solid rgba(167,139,250,.4);border-radius:999px;padding:1px 8px;margin-right:6px}
    .fg-title{font-weight:600}
    .fg-id{color:var(--dim);font-size:12px}
    .fg-meta{color:var(--muted);font-size:12.5px;margin-top:4px}
    .fg-summary{margin-top:6px}
    .fg-class{color:var(--dim);font-size:12px;margin-top:4px}
    .fg-empty{color:var(--muted)}
    .fg-foot{color:var(--dim);font-size:12.5px;margin-top:8px;text-align:center}`;

// renderSurfaceHtml(queue) -> a COMPLETE, self-contained founder-readable page. Pure:
// same queue in, byte-identical page out (no clock, no randomness). It composes the
// derived summary and the FROZEN read-only queue view into one dedicated surface. It
// carries NO <script>, <form>, <button>, on* handler, or navigable link — the page is
// observably read-only. Data-class redaction flows through from the composed view: a
// protected item's content never appears in the clear on this surface either.
export function renderSurfaceHtml(queue) {
  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="utf-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `  <title>CTO Queue — FounderGate</title>`,
    `  <style>${SURFACE_STYLE}`,
    `  </style>`,
    `</head>`,
    `<body>`,
    `  <div class="fg-wrap">`,
    `    <div class="fg-eyebrow">READ-ONLY SURFACE</div>`,
    `    <h1>CTO Queue</h1>`,
    `    <p class="fg-sub">Everything the Project Guide has routed for a decision, in one place. This surface only shows the queue — it approves nothing, runs nothing, and sends nothing.</p>`,
    indent(renderDigestHtml(queue)),
    indent(renderQueueHtml(queue)),
    `    <p class="fg-foot">Read-only view · the act edge (approve / run) is not wired here.</p>`,
    `  </div>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

function indent(block) {
  return block.split("\n").map((l) => (l === "" ? l : `    ${l}`)).join("\n");
}

// renderSurfaceText(queue) -> plain-text dedicated surface (summary + list). Pure. Useful
// for a terminal/log rendering and for tests that assert content without HTML.
export function renderSurfaceText(queue) {
  return [
    renderDigestText(queue),
    "",
    renderQueueText(queue),
  ].join("\n");
}
