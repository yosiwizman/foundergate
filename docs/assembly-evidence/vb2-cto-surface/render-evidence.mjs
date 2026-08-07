// FounderGate V8-B VB2 — CTO queue surface EVIDENCE GENERATOR.
//
// Plain English: this renders the dedicated CTO queue surface from a fixed sample queue
// and writes the page to `cto-queue-surface.html` next to this file — the "live queue UI
// evidence" the V8-B completion matrix asked for. It is a build/evidence tool, kept OUT of
// src/ on purpose so the production surface module stays free of any fs/io surface (the
// VB2 no-act-edge proof scans src/ only). Deterministic: same sample in, byte-identical
// page out. It only reads the queue and writes ONE html artifact; it takes no other action.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emptyQueue, addItem } from "../../../src/v8b2/cto-queue.mjs";
import { renderSurfaceHtml } from "../../../src/v8b2/cto-queue-surface.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// A representative routed queue. created_at is DATA (fixed ISO strings) — never a clock read.
let q = emptyQueue();
q = addItem(q, {
  id: "q000000000001", title: "Route Guide draft: tighten onboarding copy",
  kind: "guide_draft", status: "queued", created_at: "2026-07-12T09:00:00Z",
  summary: "The Guide drafted three copy edits for the welcome screen; founder to review before anything runs.",
  requested_by: "project-guide", data_class: "INTERNAL",
});
q = addItem(q, {
  id: "q000000000002", title: "Review run plan for the preview deploy",
  kind: "review", status: "blocked", created_at: "2026-07-12T10:15:00Z",
  summary: "A gate has not cleared this yet — waiting on the founder decision.",
  requested_by: "founder", data_class: "PUBLIC",
});
q = addItem(q, {
  id: "q000000000003", title: "Recorded: dependency license register drafted",
  kind: "run_draft", status: "done", created_at: "2026-07-11T16:40:00Z",
  summary: "The register was drafted and recorded complete; no action pending.",
  requested_by: "project-guide", data_class: "PUBLIC",
});
q = addItem(q, {
  id: "q000000000004", title: "Note routed from Bug Collector",
  kind: "note", status: "UNKNOWN", created_at: "2026-07-12T11:05:00Z",
  summary: "Evidence does not yet show a status for this routed note.",
  requested_by: "bug-collector", data_class: "INTERNAL",
});

const html = renderSurfaceHtml(q);
const out = join(HERE, "cto-queue-surface.html");
writeFileSync(out, html + "\n");
console.log(`wrote ${out} (${html.length} bytes)`);
