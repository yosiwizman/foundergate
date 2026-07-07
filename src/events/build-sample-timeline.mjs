// FounderGate — sample timeline builder.
//
// Builds a GENERIC example autonomous run as an append-only evidence timeline,
// running every event through the real writer so the schema + source law are
// exercised end-to-end. The narrative here is illustrative product sample data
// (a placeholder org/project), not any real customer run.
//
// HONESTY CONTRACT: each event carries the MOST HONEST source available at the
// time the timeline is authored. Events that have genuinely happened are labelled
// with a verifiable source (github / command_output / local_file). Events that
// have not happened yet are labelled `planned`; events with no real artifact are
// labelled `mock`. Nothing here claims proof it does not have — that is the entire
// point of the source law.
//
// Usage:
//   node src/events/build-sample-timeline.mjs                     # -> sample-timeline.jsonl
//   node src/events/build-sample-timeline.mjs --out /tmp/x.jsonl  # temp path
//
// This is a harness artifact. It writes ONLY to a local file, never to a
// protected store, and activates nothing.

import { writeMany, summarize, readTimeline } from "./evidence-bus.mjs";

// A generic placeholder run. These are illustrative values, not a real run.
const RUN = {
  branch: "foundergate/example-feature-lane",
  worktree: "/example/worktrees/wt-example",
  baseSha: "0000000a",
  repo: "your-org/your-project",
};

// Each event is authored with an honest source. Timestamps are illustrative but
// monotonic; the ids are stable so the timeline is reproducible.
export const SAMPLE_EVENTS = [
  {
    id: "ex-01-founder-prompt",
    ts: "2026-01-01T04:00:00Z",
    type: "founder_prompt",
    actor: "founder",
    subject: RUN.branch,
    summary:
      "Run directive: build an append-only evidence bus / event timeline (additive-only).",
    source: {
      type: "manual_note",
      ref: "run directive (example lane)",
      detail: "delivered as the lane prompt, not machine-recorded",
    },
  },
  {
    id: "ex-02-lane-spawned",
    ts: "2026-01-01T04:00:30Z",
    type: "lane_spawned",
    actor: "orchestrator",
    subject: "wt-example",
    summary: "Isolated writer lane spawned in a dedicated git worktree.",
    source: {
      type: "command_output",
      ref: `git worktree add -b ${RUN.branch} ${RUN.worktree} origin/main`,
      detail: `HEAD now at ${RUN.baseSha}`,
    },
  },
  {
    id: "ex-03-branch-created",
    ts: "2026-01-01T04:00:31Z",
    type: "branch_created",
    actor: "orchestrator",
    subject: RUN.branch,
    summary: "Lane branch created off origin/main and set to track it.",
    source: {
      type: "command_output",
      ref: `git branch (${RUN.branch})`,
      detail: `tracking origin/main @ ${RUN.baseSha}`,
    },
  },
  {
    id: "ex-04-upstream-commit",
    ts: "2026-01-01T03:55:00Z",
    type: "commit",
    actor: "origin/main",
    subject: "deadbeef",
    summary:
      "Real upstream commit that this lane's base includes (illustrative).",
    source: {
      type: "github",
      ref: `https://github.com/${RUN.repo}/commit/deadbeef`,
      detail: "verifiable on origin/main history",
    },
  },
  {
    id: "ex-05-ci-safety",
    ts: "2026-01-01T04:20:00Z",
    type: "ci_result",
    actor: "ci",
    subject: RUN.branch,
    summary: "Local static safety gate run for this lane before commit.",
    source: {
      type: "command_output",
      ref: "npm test",
      detail: "expected marker: ALL GREEN",
    },
  },
  {
    id: "ex-06-route-proof",
    ts: "2026-01-01T04:21:00Z",
    type: "route_proof",
    actor: "harness",
    subject: "example refuse-before-act route",
    summary:
      "A verifiable local artifact cited as an illustrative cross-reference.",
    source: {
      type: "local_file",
      ref: "docs/example/route-proof/blocked-action.txt",
      detail: "tracked repo file; re-readable independently",
    },
  },
  {
    id: "ex-07-commit-pending",
    ts: "2026-01-01T04:30:00Z",
    type: "commit",
    actor: "lane",
    subject: RUN.branch,
    summary:
      "This lane's own commit — not yet made when the timeline is authored, labelled honestly as planned.",
    source: {
      type: "planned",
      ref: `pending: single commit on ${RUN.branch}`,
      detail: "SHA unknown at author time; do NOT treat as proof",
    },
  },
  {
    id: "ex-08-pr-opened",
    ts: "2026-01-01T04:31:00Z",
    type: "pr_opened",
    actor: "lane",
    subject: RUN.branch,
    summary: "Draft PR to be opened for this lane (planned at author time).",
    source: {
      type: "planned",
      ref: `pending: draft PR for ${RUN.branch}`,
      detail: "PR number unknown until pushed",
    },
  },
  {
    id: "ex-09-copilot",
    ts: "2026-01-01T04:32:00Z",
    type: "copilot_result",
    actor: "code-reviewer[bot]",
    subject: RUN.branch,
    summary: "Automated review requested; verdict pending — labelled planned, not passed.",
    source: {
      type: "planned",
      ref: "pending: automated review verdict",
      detail: "reviewer requested; no verdict yet",
    },
  },
  {
    id: "ex-10-advisor",
    ts: "2026-01-01T04:33:00Z",
    type: "advisor_verdict",
    actor: "advisor",
    subject: RUN.branch,
    summary:
      "No advisor lane ran for this example — a mock placeholder purely to exercise the schema for this event type.",
    source: {
      type: "mock",
      ref: "mock: no advisor executed for this example",
      detail: "UNVERIFIED by design; never counts as proof",
    },
  },
  {
    id: "ex-11-gate-report",
    ts: "2026-01-01T04:34:00Z",
    type: "gate_report",
    actor: "lane",
    subject: RUN.branch,
    summary: "Writer encountered no true founder gate this run.",
    source: {
      type: "manual_note",
      ref: "lane self-report: no true gate",
      detail: "asserted by the lane; not machine-verifiable",
    },
  },
  {
    id: "ex-12-upstream-merge",
    ts: "2026-01-01T03:50:00Z",
    type: "merge",
    actor: "sheriff",
    subject: "PR #1",
    summary:
      "Real upstream merge on origin/main cited as a verifiable example of a merge event.",
    source: {
      type: "github",
      ref: `https://github.com/${RUN.repo}/pull/1`,
      detail: "merged before this lane's base; verifiable",
    },
  },
  {
    id: "ex-13-merge-pending",
    ts: "2026-01-01T04:35:00Z",
    type: "merge",
    actor: "sheriff",
    subject: RUN.branch,
    summary:
      "This lane never merges itself — merge is sheriff-gated and therefore planned, not done.",
    source: {
      type: "planned",
      ref: "sheriff-gated: only the merge sheriff merges",
      detail: "writer lanes never self-merge",
    },
  },
  {
    id: "ex-14-doctor-proof",
    ts: "2026-01-01T04:36:00Z",
    type: "doctor_proof",
    actor: "harness",
    subject: RUN.branch,
    summary:
      "No doctor/health probe was run in this lane — mock placeholder for the event type.",
    source: {
      type: "mock",
      ref: "mock: no doctor probe executed for this example",
      detail: "UNVERIFIED by design",
    },
  },
  {
    id: "ex-15-screenshot",
    ts: "2026-01-01T04:37:00Z",
    type: "screenshot",
    actor: "founder",
    subject: RUN.branch,
    summary:
      "A captured screenshot cited as a verifiable visual witness (illustrative).",
    source: {
      type: "screenshot",
      ref: "docs/example/screenshots/feature-working.png",
      detail: "tracked image; re-viewable independently",
    },
  },
  {
    id: "ex-16-human-witness",
    ts: "2026-01-01T04:38:00Z",
    type: "human_witness",
    actor: "founder",
    subject: RUN.branch,
    summary:
      "Last-inch human witness: founder confirmed the feature works on their device.",
    source: {
      type: "human_witness",
      ref: "founder smoke-check (verbal confirmation, logged)",
      detail: "traceable to the founder; a human re-check is possible",
    },
  },
];

function parseOut(argv) {
  const i = argv.indexOf("--out");
  return i !== -1 && argv[i + 1] ? argv[i + 1] : undefined;
}

// Only run when invoked directly (not when imported by the selftest).
const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("build-sample-timeline.mjs");

if (invokedDirectly) {
  const out = parseOut(process.argv.slice(2));
  const opts = out ? { path: out } : {};
  writeMany(SAMPLE_EVENTS, opts);
  const events = readTimeline(out);
  const rollup = summarize(events);
  console.log(
    `Timeline built: ${rollup.total} events -> ${out || "src/events/sample-timeline.jsonl"}`
  );
  console.log("  proof grades:", JSON.stringify(rollup.byGrade));
  console.log("  by source   :", JSON.stringify(rollup.bySource));
}
