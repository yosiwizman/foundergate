// FounderGate V8-A1 — Truth Dashboard view-model (PURE; no node, no browser API).
//
// Turns the reader's honest model into the render structure for every V8-A1
// screen/card. Because it is pure and dependency-free, the SAME module is used by
// the browser (index.html) and by a Node self-test — so what CI proves is exactly
// what the founder sees. It NEVER invents state: it forwards UNKNOWN verbatim.

export const UNKNOWN = "UNKNOWN";

// A19 — the permanent NON-DEVELOPER FAILURE-MODES REMINDER. All ten lines,
// verbatim from Roadmap V8.11 §3.2.
export const FAILURE_MODES = Object.freeze([
  "green CI ≠ product works",
  "merged ≠ usable",
  "backend-witnessed ≠ UI-witnessed",
  "preview ≠ live",
  "mock provider ≠ real provider",
  "docs ≠ system exists",
  "agent confidence ≠ proof",
  "a screenshot ≠ disk proof",
  "a demo ≠ production",
  "a local tool ≠ a business",
]);

// The 8 founder priority questions, in strict order (Law 44). Used to assert the
// reader delivered them in order.
export const EIGHT_QUESTIONS = Object.freeze([
  "What is happening?",
  "Do I need to do anything?",
  "Is anything dangerous?",
  "What is blocked?",
  "What can I safely test?",
  "What must not be touched?",
  "What changed since last time?",
  "Where is the evidence?",
]);

function isUnknown(v) {
  return v === UNKNOWN || v === "NOT CONNECTED" || v == null;
}

// Badge descriptor for a value: UNKNOWN / STALE render as a warning class, never
// as green.
export function badge(value) {
  if (isUnknown(value)) return { text: value == null ? UNKNOWN : value, kind: "unknown" };
  if (value === "STALE") return { text: "STALE", kind: "stale" };
  if (value === "passing") return { text: "passing", kind: "ok" };
  if (value === "failing") return { text: "failing", kind: "bad" };
  return { text: String(value), kind: "info" };
}

// Build the full view for the Project Dashboard (A13) from the reader model.
export function buildView(model) {
  const m = model || {};
  const questions = Array.isArray(m.answers) ? m.answers : [];

  return {
    // A11 shell header + A12 projects summary
    header: {
      title: "FounderGate — Truth Dashboard (V8-A1)",
      connected: !!m.connected,
      projectName: m.connected && m.project && m.project.name ? m.project.name : UNKNOWN,
      releaseLabel: m.releaseLabel || UNKNOWN,
      dataClass: m.dataClass || UNKNOWN,
      stageBanner: "V8-A1 Truth Dashboard MVP — read-only. This is not product proof.",
    },
    projects: [
      m.connected
        ? { id: m.project && m.project.project_id, name: m.project && m.project.name, attention: m.state === "blocked" }
        : { id: UNKNOWN, name: "No project attached", attention: false },
    ],
    // A14 status / current-state card
    statusCard: {
      state: m.state || UNKNOWN,
      ci: badge(m.ci),
      pr: badge(m.pr),
      currentGate: m.currentGate || UNKNOWN,
    },
    // A16 CI/PR UNKNOWN handling is expressed via badge kind === "unknown"
    ciUnknown: isUnknown(m.ci),
    prUnknown: isUnknown(m.pr),
    // A15 view-only gate/blocker cards (Law 55)
    gates: (m.gates || []).map((g) => ({
      id: g.id,
      title: g.title,
      state: g.state,
      viewOnly: g.viewOnly === true,
      description: g.description,
      // V8-A1: no approve button, ever.
      approvable: false,
    })),
    // A17 "what founder should do now"
    needsYou: {
      title: "What you should do now",
      text: questions[1] ? questions[1].a : UNKNOWN,
      source: questions[1] ? questions[1].source : UNKNOWN,
    },
    // A18 "what must not be touched"
    doNotTouch: {
      title: "What must not be touched",
      items: m.doNotTouch || [],
    },
    // The 8 questions in strict order (A13 core)
    questions: questions.map((q) => ({ q: q.q, a: q.a, source: q.source, unknown: isUnknown(q.a) })),
    // A19 permanent failure-modes reminder
    failureModes: FAILURE_MODES,
    // A20 basic Doctor panel (version/health only)
    doctor: buildDoctor(m),
    // A21 honest-scope Panic Card
    panic: {
      title: "Panic / Stop",
      scope: m.panic ? m.panic.scope : UNKNOWN,
      trackedCount: m.panic ? m.panic.trackedProcesses.length : 0,
      honest: true,
    },
    // A22 data classification badges
    dataBadges: {
      projectClass: m.dataClass || UNKNOWN,
      hideSecretValues: true,
      blockUnknownFiles: true,
    },
    // A23 cost guard display (policy/config only)
    cost:
      m.cost && m.cost !== UNKNOWN
        ? {
            enforcement: m.cost.enforcement,
            label: "policy/config only — runtime enforcement begins V8-B",
            monthly_limit_usd: m.cost.monthly_limit_usd,
            paid_services_blocked: m.cost.paid_services_blocked,
          }
        : { enforcement: UNKNOWN, label: "policy/config only — runtime enforcement begins V8-B" },
    // evidence with freshness (A16/STALE)
    evidence: m.evidence || [],
  };
}

// A20 — basic Doctor version/health panel. Reports which V8-A1 subset files the
// reader found (presence), never inventing health it cannot see.
export function buildDoctor(model) {
  const p = (model && model.presence) || {};
  const checks = [
    { name: "project.json", ok: !!p.project },
    { name: "status.json", ok: !!p.status },
    { name: "locks.json", ok: !!p.locks },
    { name: "run_state.json", ok: !!p.run_state },
    { name: "data_classification.json", ok: !!p.data_classification },
    { name: "cost_budget.json", ok: !!p.cost_budget },
    { name: "release_label.json", ok: !!p.release_label },
    { name: "gates/", ok: !!p.gates },
    { name: "witnesses/", ok: !!p.witnesses },
    { name: "evidence/", ok: !!p.evidence },
  ];
  const present = checks.filter((c) => c.ok).length;
  return {
    version: "V8-A1",
    reader: "ok",
    connected: !!(model && model.connected),
    filesPresent: `${present}/${checks.length}`,
    checks,
  };
}
