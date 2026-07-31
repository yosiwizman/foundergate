// Lane B3 — Founder View: compose the beta-spine into ONE founder-facing screen.
//
// Plain English: the founder should not have to open six different modules to
// understand where a run stands. This composes the already-audited components —
// status cards, command center, live console, install doctor, URL intake,
// evidence drawer, and decision package — into a single truthful view-model plus
// one plain-text screen.
//
// This module INVENTS NOTHING. It does not compute lifecycle, liveness, verdicts,
// freshness, or readiness itself — it delegates to the audited child modules and
// simply arranges their honest output. When an input signal is missing, the whole
// section is the string UNKNOWN and is named in `unknowns[]`. It never shows a
// green/READY/ship state that the underlying evidence did not produce.
//
// Pure + deterministic: no I/O, no clock, no randomness, no eval. All founder text
// is inert data — rendering delegates to the child modules' own escaping.

import { buildCards, renderCardsText } from "../dashboard/status-cards.mjs";
import { buildCommandCenter, renderCommandCenterText } from "../command-center/command-center.mjs";
import {
  buildConsoleView,
  renderConsoleText,
  buildDoctorChecklist,
  renderDoctorText,
} from "../../autonomous-run/console/run-console.mjs";
import { buildIntakeView, renderIntakeText } from "../../founder_url_drop/intake/url-intake.mjs";
import { buildDrawer, renderDrawerText } from "../../founder_url_drop/evidence_drawer/evidence-drawer.mjs";
import { buildDecisionPackage, renderDecisionText } from "../../evidence/decision-package/decision-package.mjs";

export const UNKNOWN = "UNKNOWN";

// A present-but-not-fabricated signal is one the founder actually supplied.
function has(v) {
  return v !== undefined && v !== null;
}

// Section registry. Each section declares:
//  - key:      property name on the composed view
//  - label:    human header used in the plain-text screen
//  - present:  predicate over the raw input — true only when the founder gave the
//              signal(s) this section needs. False -> the section is UNKNOWN.
//  - build:    delegate to the audited child module (never reinvent its logic)
//  - render:   delegate to the child module's own (escaping) renderer
//
// Order here is the order shown on the founder screen.
const SECTIONS = [
  {
    key: "statusCards",
    label: "STATUS CARDS",
    present: (i) => has(i.state) || has(i.handoff) || has(i.runId),
    build: (i) => buildCards({
      runId: i.runId,
      state: i.state,
      handoff: i.handoff,
      heartbeat: i.heartbeat,
      nowMs: i.nowMs,
    }),
    render: (cards) => renderCardsText(cards),
  },
  {
    key: "commandCenter",
    label: "COMMAND CENTER",
    present: (i) => has(i.state) || has(i.handoff) || has(i.runId),
    build: (i) => buildCommandCenter({
      runId: i.runId,
      state: i.state,
      handoff: i.handoff,
      heartbeat: i.heartbeat,
      events: i.events,
      evidence: i.evidence,
      nowMs: i.nowMs,
    }),
    render: (cc) => renderCommandCenterText(cc),
  },
  {
    key: "console",
    label: "LIVE RUN CONSOLE",
    present: (i) => has(i.state) || has(i.handoff) || has(i.runId),
    build: (i) => buildConsoleView({
      runId: i.runId,
      state: i.state,
      handoff: i.handoff,
      heartbeat: i.heartbeat,
      events: i.events,
      nowMs: i.nowMs,
    }),
    render: (v) => renderConsoleText(v),
  },
  {
    key: "doctor",
    label: "INSTALL DOCTOR",
    present: (i) => has(i.presence),
    build: (i) => buildDoctorChecklist(i.presence),
    render: (d) => renderDoctorText(d),
  },
  {
    key: "intake",
    label: "URL INTAKE",
    // Intake is only built when the founder actually dropped a URL.
    present: (i) => has(i.url),
    build: (i) => buildIntakeView(i.url),
    render: (v) => renderIntakeText(v),
  },
  {
    key: "drawer",
    label: "EVIDENCE DRAWER",
    present: (i) => has(i.safetyResult) || has(i.evidencePack),
    build: (i) => buildDrawer({ safetyResult: i.safetyResult, evidencePack: i.evidencePack }),
    render: (d) => renderDrawerText(d),
  },
  {
    key: "decision",
    label: "DECISION PACKAGE",
    present: (i) => has(i.decision),
    build: (i) => {
      const d = i.decision || {};
      return buildDecisionPackage({
        verdict: d.verdict,
        claims: d.claims,
        limitations: d.limitations,
        evidence_sha256: d.evidence_sha256,
        run_id: d.run_id,
      });
    },
    render: (pkg) => renderDecisionText(pkg),
  },
];

// Build the single composed founder view. Missing signal -> section is UNKNOWN and
// named in `unknowns`. No section is ever fabricated into a green/ready state.
export function buildFounderView(input = {}) {
  const i = input && typeof input === "object" ? input : {};
  const view = { title: "FounderGate — Founder View" };
  const unknowns = [];
  for (const s of SECTIONS) {
    if (s.present(i)) {
      // Delegate to the audited child module. Whatever honest value it produces
      // (including its own internal UNKNOWN/NONE fields) is what we show.
      view[s.key] = s.build(i);
    } else {
      view[s.key] = UNKNOWN;
      unknowns.push(s.key);
    }
  }
  view.unknowns = Object.freeze(unknowns);
  return Object.freeze(view);
}

// Render one founder-readable multi-section plain-text screen. Each section is
// rendered by the child module that owns it (so escaping is preserved). An UNKNOWN
// section is shown plainly as UNKNOWN — never dressed up as ready.
export function renderFounderViewText(view) {
  const v = view || {};
  const lines = [];
  lines.push("================================================================");
  lines.push(String(v.title || "FounderGate — Founder View"));
  lines.push("truthful composite — UNKNOWN when a signal was not provided");
  lines.push("================================================================");
  for (const s of SECTIONS) {
    lines.push("");
    lines.push(`== ${s.label} ==`);
    const val = v[s.key];
    if (val === UNKNOWN || val === undefined) {
      lines.push(UNKNOWN);
    } else {
      lines.push(s.render(val));
    }
  }
  lines.push("");
  const unknowns = Array.isArray(v.unknowns) ? v.unknowns : [];
  lines.push(`== UNKNOWNS (${unknowns.length}) ==`);
  lines.push(unknowns.length ? unknowns.join(", ") : "(none — every section had a signal)");
  return lines.join("\n");
}
