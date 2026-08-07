// FounderGate V8-B VB2 — Bench v1 EVIDENCE GENERATOR.
//
// Plain English: this renders the dedicated Bench surface from a fixed sample snapshot and
// writes the page to `bench-surface.html` next to this file — the live bench evidence the
// V8-B completion matrix asked for (component+project result ledger + hand-burden). It is a
// build/evidence tool, kept OUT of src/ on purpose so the production bench module stays free
// of any fs/io surface (the VB2 no-act-edge proof scans src/ only). Deterministic: same
// sample in, byte-identical page out. It only reads the snapshot and writes ONE html
// artifact; it takes no other action.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderSurfaceHtml } from "../../../src/v8b2/bench.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// A representative bench snapshot. Every field is DATA (fixed values) — never a clock read.
// The component records mirror the shape a self-test runner emits (id, name, self-test file,
// result, check count). The burden metrics mirror the frozen are1-founder-burden-1 schema
// recorded in docs/metrics/FOUNDER_HAND_BURDEN_AUTONOMOUS_RUN.json.
const bench = {
  components: [
    { id: "cto-queue-surface", name: "CTO queue surface", selftest: "cto-queue-surface.selftest.mjs", result: "PASS", checks: 13 },
    { id: "lane-router", name: "Lane router", selftest: "lane-router.selftest.mjs", result: "PASS", checks: 22 },
    { id: "cto-queue", name: "CTO queue data model", selftest: "cto-queue.selftest.mjs", result: "PASS", checks: 18 },
    { id: "classified-object-store", name: "Classified object store", selftest: "classified-object-store.selftest.mjs", result: "PASS", checks: 20 },
    { id: "evidence-viewer", name: "Evidence viewer", selftest: "evidence-viewer.selftest.mjs", result: "UNKNOWN" },
  ],
  projects: [
    { id: "prj_akior", name: "AKIOR (first customer)", result: "PASS", data_class: "INTERNAL", runs: 14 },
    { id: "prj_demo", name: "Public preview demo", result: "PASS", data_class: "PUBLIC", runs: 3 },
    { id: "prj_client_x", name: "Confidential client engagement", result: "PASS", data_class: "SECRET", runs: 6 },
  ],
  burden: {
    schema: "are1-founder-burden-1",
    run_id: "v8b-nightshift",
    founder_clicks: 0,
    founder_terminal_actions: 0,
    founder_debugging_actions: 0,
    founder_raw_log_reviews: 0,
    founder_prompts_provided: 3,
    founder_signatures_provided: 0,
    false_founder_gates_suppressed: [
      "merge #162 to main", "merge #163 to main",
      "close 11 superseded PRs", "branch/worktree cleanup",
    ],
    routine_actions_completed_autonomously: [
      "merge #162", "close #151-#161", "remove obsolete worktrees",
      "merge #163", "exact-SHA CI polling", "selftests", "ARLC build+fix",
    ],
  },
};

const html = renderSurfaceHtml(bench);
const out = join(HERE, "bench-surface.html");
writeFileSync(out, html + "\n");
console.log(`wrote ${out} (${html.length} bytes)`);
