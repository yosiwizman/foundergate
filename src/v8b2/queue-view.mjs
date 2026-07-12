// FounderGate V8-B VB2 — CTO queue READ-ONLY UI SHELL (display only, NON-EXECUTING).
//
// Plain English: this renders a CTO queue into founder-readable text/HTML so the founder
// can SEE what has been routed. It is observably read-only: each function takes a queue
// and RETURNS A STRING. It never acts, wires, approves, or executes; it has no buttons,
// no handlers, no act edge. There is no import of fs / net / child_process here — the
// module physically cannot write, send, or run anything.
//
// The build contract calls these dashboard shells "wide-safe": plain-English, no
// scary/ambiguous affordances, and no action-looking buttons that are not wired (none
// are wired — VB3 does not exist under this scaffold).

import { listItems, isDisplayableClass, REDACTED, STATUS, UNKNOWN } from "./cto-queue.mjs";

// Plain-English label per status — read-only presentation, no behaviour.
const STATUS_LABEL = Object.freeze({
  queued: "Queued — waiting, no action taken",
  blocked: "Blocked — a gate has not cleared this",
  done: "Done — recorded complete",
  [UNKNOWN]: "Unknown — status not shown by the evidence",
});

function labelFor(status) {
  return STATUS_LABEL[status] || STATUS_LABEL[UNKNOWN];
}

// LOW-1 (defense-in-depth): re-assert the data-class boundary AT DISPLAY. Ingress
// already refuses SECRET/blocked classes, but a caller could hand-craft a queue that
// bypasses addItem. So before displaying, any item whose data_class is not a permitted
// display class has its human CONTENT redacted — the shell never prints SECRET/blocked
// content in the clear. Pure: returns a new object, mutates nothing.
function displaySafe(it) {
  if (isDisplayableClass(it.data_class)) return it;
  return {
    id: it.id,
    kind: it.kind,
    status: it.status,
    created_at: it.created_at,
    title: REDACTED,
    summary: REDACTED,
    requested_by: REDACTED,
    data_class: REDACTED,
  };
}

// renderQueueText(queue) -> string. Pure: same queue in, same text out; input untouched.
export function renderQueueText(queue) {
  const items = listItems(queue).map(displaySafe);
  const lines = [];
  lines.push("CTO QUEUE (read-only view — displays routed items; takes no action)");
  lines.push(`Items: ${items.length}`);
  lines.push("");
  if (items.length === 0) {
    lines.push("  (the queue is empty)");
  } else {
    for (const it of items) {
      lines.push(`- [${it.status}] ${it.title}  (id ${it.id})`);
      lines.push(`    kind: ${it.kind} · requested by: ${it.requested_by} · created: ${it.created_at}`);
      lines.push(`    status: ${labelFor(it.status)}`);
      lines.push(`    summary: ${it.summary}`);
      lines.push(`    data class: ${it.data_class}`);
    }
  }
  lines.push("");
  lines.push("This view only displays the queue. It cannot approve, run, or send anything.");
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

// renderQueueHtml(queue) -> string of HTML. Pure display. No <script>, no form, no
// action/handler/button — nothing an interaction could ride. Just escaped text.
export function renderQueueHtml(queue) {
  const items = listItems(queue).map(displaySafe);
  const rows = items.map((it) => (
    `    <li class="fg-cto-item" data-status="${escapeHtml(it.status)}">` +
    `<span class="fg-status">${escapeHtml(it.status)}</span> ` +
    `<span class="fg-title">${escapeHtml(it.title)}</span> ` +
    `<span class="fg-id">(${escapeHtml(it.id)})</span>` +
    `<div class="fg-meta">kind ${escapeHtml(it.kind)} · by ${escapeHtml(it.requested_by)} · ${escapeHtml(it.created_at)} · ${escapeHtml(labelFor(it.status))}</div>` +
    `<div class="fg-summary">${escapeHtml(it.summary)}</div>` +
    `<div class="fg-class">data class: ${escapeHtml(it.data_class)}</div>` +
    `</li>`
  ));
  return [
    `<section class="fg-cto-queue" aria-readonly="true">`,
    `  <h2>CTO Queue</h2>`,
    `  <p class="fg-note">Read-only view. Displays routed items; it takes no action, approves nothing, runs nothing.</p>`,
    `  <p class="fg-count">Items: ${items.length}</p>`,
    items.length === 0 ? `  <p class="fg-empty">The queue is empty.</p>` : `  <ul class="fg-cto-list">`,
    ...(items.length === 0 ? [] : rows),
    items.length === 0 ? `` : `  </ul>`,
    `</section>`,
  ].filter((l) => l !== "").join("\n");
}

// The valid status values this shell knows how to display (re-exported for callers/tests).
export const DISPLAYABLE_STATUS = STATUS;
