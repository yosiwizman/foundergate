// FounderGate V8-A1 — Truth Dashboard view-model (PURE; no node, no browser API).
//
// Turns the reader's honest model into the render structure for the app-shell UI.
// Same module in the browser and in the Node self-test, so CI proves what the
// founder sees. It NEVER invents state: UNKNOWN/STALE are forwarded verbatim
// (Law 54) and only *explained* gently. Visible copy is warm, plain, non-scary.

export const UNKNOWN = "UNKNOWN";

// A19 — the permanent NON-DEVELOPER FAILURE-MODES REMINDER, all ten lines
// verbatim from Roadmap V8.11 §3.2. (Kept verbatim; not softened.)
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

// The 8 founder priority questions, in strict order (Law 44).
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

// Left-sidebar navigation. Active items work in V8-A1; future items are shown
// DISABLED with an honest stage label (UI-truth / maturity-label laws).
export const SIDEBAR_NAV = Object.freeze({
  brand: "FounderGate",
  active: Object.freeze([
    { id: "dashboard", label: "Dashboard" },
    { id: "my-project", label: "My Project" },
    { id: "settings", label: "Settings" },
  ]),
  disabled: Object.freeze([
    { id: "data", label: "Data", stage: "V8-B" },
    { id: "usage", label: "Usage", stage: "V8-B" },
    { id: "statistics", label: "Statistics", stage: "V8-C" },
    { id: "team", label: "Team", stage: "V8-C" },
    { id: "notifications", label: "Notifications", stage: "V8-B" },
    { id: "project-guide", label: "Project Guide", stage: "V8-A4" },
  ]),
});

// Words that must never appear in visible UI copy (calm, non-scary rule).
export const BANNED_WORDS = Object.freeze(["panic", "fatal", "abort"]);

function isUnknown(v) {
  return v === UNKNOWN || v === "NOT CONNECTED" || v == null;
}

// Badge: UNKNOWN/STALE render as a gentle warning, never green.
export function badge(value) {
  if (isUnknown(value)) return { text: value == null ? UNKNOWN : value, kind: "unknown", hint: "We can't see this yet." };
  if (value === "STALE") return { text: "STALE", kind: "stale", hint: "This evidence is old — treat it with care." };
  if (value === "passing") return { text: "passing", kind: "ok" };
  if (value === "failing") return { text: "failing", kind: "bad" };
  return { text: String(value), kind: "info" };
}

function greeting(model) {
  const name = model && model.connected && model.project && model.project.founder_name;
  return name ? `Welcome back, ${name}` : "Welcome back";
}

// Compose the calm, honest "Pause & get help" scope in friendly words. Same
// function as before (local halt + evidence preserved); no scary vocabulary.
function pauseScope(model) {
  const tracked = model && model.panic ? model.panic.trackedProcesses : [];
  if (!tracked || tracked.length === 0) {
    return "Nothing was running, so nothing needed stopping. Your evidence is safe.";
  }
  return `We asked the running work to pause and saved your evidence. It can pause these: ${tracked.join(", ")}.`;
}

export function buildView(model) {
  const m = model || {};
  const questions = Array.isArray(m.answers) ? m.answers : [];

  return {
    nav: SIDEBAR_NAV,
    header: {
      greeting: greeting(m),
      connected: !!m.connected,
      projectName: m.connected && m.project && m.project.name ? m.project.name : UNKNOWN,
      releaseLabel: m.releaseLabel || UNKNOWN,
      dataClass: m.dataClass || UNKNOWN,
      // friendly, non-scary honesty banner
      stageBanner: "This is an early preview you can look at safely. Passing tests don't mean it's finished yet.",
    },
    // (d) one project only — a single card, no multi-project chips.
    project: m.connected
      ? { id: m.project && m.project.project_id, name: m.project && m.project.name, needsAttention: m.state === "blocked" }
      : { id: UNKNOWN, name: "No project connected yet", needsAttention: false },
    statusCard: {
      title: "Where things stand",
      state: m.state || UNKNOWN,
      ci: badge(m.ci),
      pr: badge(m.pr),
      currentGate: m.currentGate || UNKNOWN,
    },
    ciUnknown: isUnknown(m.ci),
    prUnknown: isUnknown(m.pr),
    gates: (m.gates || []).map((g) => ({
      id: g.id, title: g.title, state: g.state, viewOnly: g.viewOnly === true,
      description: g.description, approvable: false,
    })),
    needsYou: {
      title: "What you can do now",
      text: questions[1] ? questions[1].a : UNKNOWN,
      source: questions[1] ? questions[1].source : UNKNOWN,
      unknown: questions[1] ? isUnknown(questions[1].a) : true,
    },
    doNotTouch: {
      title: "Please don't change these",
      subtitle: "They keep your project safe.",
      items: m.doNotTouch || [],
    },
    questions: {
      title: "Your quick check-in",
      items: questions.map((q, i) => ({ n: i + 1, q: q.q, a: q.a, source: q.source, unknown: isUnknown(q.a) })),
    },
    failureModes: { title: "Good things to remember", lines: FAILURE_MODES },
    doctor: buildDoctor(m),
    // (c) calm "Pause & get help" — same function, friendly scope, no scary words.
    pause: {
      title: "Pause & get help",
      button: "Pause & get help",
      hint: "Safely pause work and save your evidence.",
      scope: pauseScope(m),
      trackedCount: m.panic ? m.panic.trackedProcesses.length : 0,
    },
    dataBadges: {
      title: "Data safety",
      projectClass: m.dataClass || UNKNOWN,
      note: "Secret values are hidden and files we don't recognise are blocked.",
    },
    cost: (() => {
      const c = m.cost && m.cost !== UNKNOWN ? m.cost : null;
      return {
        title: "Spending",
        friendly: "This is just a display for now — real spending limits switch on in a later version (V8-B).",
        monthly_limit_usd: c ? c.monthly_limit_usd : UNKNOWN,
        paid_services_blocked: c ? c.paid_services_blocked : UNKNOWN,
        enforcement: c ? c.enforcement : UNKNOWN,
      };
    })(),
    evidence: (m.evidence || []).map((e) => ({ ...e, badge: badge(e.label) })),
  };
}

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
    title: "Health check",
    version: "V8-A1",
    connected: !!(model && model.connected),
    filesPresent: `${present}/${checks.length}`,
    checks,
  };
}

// Collect every human-visible string the view renders — used by the friendly-copy
// lint to guarantee no banned (scary) word reaches the UI.
export function visibleStrings(view) {
  const out = [];
  const push = (...xs) => xs.forEach((x) => { if (typeof x === "string") out.push(x); });
  push(view.nav.brand, view.header.greeting, view.header.stageBanner, view.header.projectName);
  view.nav.active.forEach((n) => push(n.label));
  view.nav.disabled.forEach((n) => push(n.label, n.stage));
  push(view.project.name);
  push(view.statusCard.title, view.statusCard.state, view.statusCard.ci.text, view.statusCard.ci.hint, view.statusCard.pr.text, view.statusCard.pr.hint, view.statusCard.currentGate);
  view.gates.forEach((g) => push(g.title, g.state, g.description));
  push(view.needsYou.title, view.needsYou.text);
  push(view.doNotTouch.title, view.doNotTouch.subtitle);
  view.doNotTouch.items.forEach((d) => push(d.path, d.reason));
  push(view.questions.title);
  view.questions.items.forEach((q) => push(q.q, q.a));
  push(view.failureModes.title, ...view.failureModes.lines);
  push(view.doctor.title, view.doctor.filesPresent);
  view.doctor.checks.forEach((c) => push(c.name));
  push(view.pause.title, view.pause.button, view.pause.hint, view.pause.scope);
  push(view.dataBadges.title, view.dataBadges.projectClass, view.dataBadges.note);
  push(view.cost.title, view.cost.friendly);
  view.evidence.forEach((e) => push(e.path, e.badge.text, e.badge.hint));
  return out;
}
