// FounderGate V8-B VB2 — UNIFIED LANE ROUTER EVIDENCE GENERATOR.
//
// Plain English: this renders the dedicated lane-routing surface from a fixed pair of
// sample snapshots — an ARLC lifecycle queue and an ARE run queue — and writes the page to
// `lane-router-surface.html` next to this file. That page is the "end-to-end routing
// evidence" the V8-B completion matrix asked for: a founder can open it and see every
// in-flight lane from BOTH queues in one place, and exactly where each one routes — to the
// backend on its own, or to them. It is a build/evidence tool, kept OUT of src/ on purpose
// so the production router module stays free of any fs/io surface (the VB2 no-act-edge proof
// scans src/ only). Deterministic: same samples in, byte-identical page out. It only reads
// the snapshots and writes ONE html artifact; it takes no other action.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSurfaceHtml } from "../../../src/v8b2/lane-router.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// A representative pair of snapshots. All state is DATA (fixed strings) — never a clock read
// and never invented by the router. The router derives each destination from this alone.
const snapshots = {
  // ARLC — repository / branch / PR / lane lifecycle work.
  arlc: {
    lanes: [
      { lane_id: "arlc-merge-174", title: "Merge qualified cumulative PR #174 to main",
        state: "READY", data_class: "PUBLIC" },
      { lane_id: "arlc-close-superseded", title: "Close superseded PR #170",
        state: "READY", data_class: "PUBLIC" },
      { lane_id: "arlc-provider-default", title: "Adopt default model provider for the run",
        state: "READY", founder_gate_required: true, data_class: "PUBLIC" },
      { lane_id: "arlc-branch-cleanup", title: "Remove worktree with no unique work",
        state: "RECONCILING", data_class: "PUBLIC" },
      { lane_id: "arlc-merged-168", title: "Recorded: PR #168 merged and reconciled",
        state: "CLOSED", data_class: "PUBLIC" },
    ],
  },
  // ARE — blueprint -> plan -> lanes -> runs -> evidence run envelope.
  are: {
    items: [
      { run_id: "are-nightshift", title: "V8-B Nightshift run — wide-safe lanes",
        state: "RUNNING", data_class: "PUBLIC" },
      { run_id: "are-plan-checked", title: "Spec-card plan cleared the independent checker",
        state: "PLAN_CHECKED", data_class: "PUBLIC" },
      { run_id: "are-public-release", title: "Public release of the founder surface",
        state: "TRUE_FOUNDER_GATE", data_class: "PUBLIC" },
      { run_id: "are-license-review", title: "Dependency license needs a judgment call",
        state: "HUMAN_EXPERT_GATE", data_class: "PUBLIC" },
      { run_id: "are-checker-findings", title: "Checker returned findings to correct",
        state: "CHECKER_FINDINGS", data_class: "PUBLIC" },
      { run_id: "are-stuck", title: "Lane blocked pending an upstream artifact",
        state: "BLOCKED", data_class: "PUBLIC" },
      { run_id: "are-sealed-pass", title: "Recorded: run sealed evidence and PASSed",
        state: "PASS", data_class: "PUBLIC" },
    ],
  },
};

const html = renderSurfaceHtml(snapshots);
const out = join(HERE, "lane-router-surface.html");
writeFileSync(out, html + "\n");
console.log(`wrote ${out} (${html.length} bytes)`);
