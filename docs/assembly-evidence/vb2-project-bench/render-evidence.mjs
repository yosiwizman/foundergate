// FounderGate V8-B VB2 — PROJECT BENCH EVIDENCE GENERATOR.
//
// Plain English: this renders the dedicated Project Bench surface from a fixed sample snapshot
// and writes the page to `project-bench-surface.html` next to this file — the live per-project
// result-ledger evidence the V8-B completion matrix asked for. It is a build/evidence tool,
// kept OUT of src/ on purpose so the production module stays free of any fs/io surface (the VB2
// no-act-edge proof scans src/ only). Deterministic: same sample in, byte-identical page out.
// It only reads the snapshot and writes ONE html artifact; it takes no other action.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderProjectBenchSurfaceHtml } from "../../../src/v8b2/project-bench.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// A representative per-project snapshot. Every field is DATA (fixed values) — never a clock
// read. Each project carries its own run TIMELINE (oldest → newest); `at` is an inert display
// string. The point of this sample is to show all four honest cases at once:
//   - AKIOR: three green runs -> PROVEN, a 3-run streak.
//   - Public preview demo: passed, then broke -> the LATEST run failed, so it reads FAILED and
//     REGRESSED (a flat roster would still call this "one pass, one fail" and bury the break).
//   - Confidential client engagement: SECRET data class -> name redacted, but its result,
//     timeline and recovery flag stay visible because a result is a fact, not private content.
//   - New R&D spike: no runs yet -> UNKNOWN, never flattered to proven.
const projects = [
  {
    id: "prj_akior", name: "AKIOR (first customer)", data_class: "INTERNAL",
    runs: [
      { run_id: "v8b-w1", result: "PASS", at: "2026-07-14T09:00:00Z" },
      { run_id: "v8b-w1b", result: "PASS", at: "2026-07-16T09:00:00Z" },
      { run_id: "v8b-nightshift", result: "PASS", at: "2026-07-18T02:00:00Z" },
    ],
    components: [
      { id: "cto-queue-surface", name: "CTO queue surface", selftest: "cto-queue-surface.selftest.mjs", result: "PASS", checks: 13 },
      { id: "lane-router", name: "Lane router", selftest: "lane-router.selftest.mjs", result: "PASS", checks: 22 },
      { id: "bench", name: "Bench v1", selftest: "bench.selftest.mjs", result: "PASS", checks: 25 },
    ],
  },
  {
    id: "prj_demo", name: "Public preview demo", data_class: "PUBLIC",
    runs: [
      { run_id: "demo-r1", result: "PASS", at: "2026-07-11T12:00:00Z" },
      { run_id: "demo-r2", result: "PASS", at: "2026-07-15T12:00:00Z" },
      { run_id: "demo-r3", result: "FAIL", at: "2026-07-18T12:00:00Z" },
    ],
    components: [
      { id: "preview-bay", name: "Preview bay", selftest: "preview-bay.selftest.mjs", result: "FAIL", checks: 6 },
    ],
  },
  {
    id: "prj_client_x", name: "Confidential client engagement", data_class: "SECRET",
    runs: [
      { run_id: "cx-r1", result: "FAIL", at: "2026-07-10T00:00:00Z" },
      { run_id: "cx-r2", result: "PASS", at: "2026-07-17T00:00:00Z" },
    ],
    components: [],
  },
  {
    id: "prj_spike", name: "New R&D spike", data_class: "INTERNAL",
    runs: [],
    components: [],
  },
];

const html = renderProjectBenchSurfaceHtml(projects);
const out = join(HERE, "project-bench-surface.html");
writeFileSync(out, html + "\n");
console.log(`wrote ${out} (${html.length} bytes)`);
