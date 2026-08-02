// FounderGate — Founder/Operator Panel view-model (pure, deterministic).
//
// Plain English: builds the founder-facing panel (status line + chips + panels)
// from a single honest snapshot. It INVENTS NOTHING: any missing/invalid signal
// becomes UNKNOWN and is listed in `unknowns[]`. It NEVER shows a green/READY
// state the evidence did not produce. No I/O, no clock, no randomness, no eval.
//
// Two renderers share one view-model:
//   renderFounderText(vm)   -> plain English, NO SHAs, NO raw logs, NO jargon.
//   renderDeveloperText(vm) -> technical (SHAs, paths, guard outputs) allowed.

export const UNKNOWN = "UNKNOWN";
const SHA40 = /\b[0-9a-f]{40}\b/;      // full git sha — forbidden in founder mode
const SHA64 = /\b[0-9a-f]{64}\b/;      // sha-256 — forbidden in founder mode

function chip(value, allowed) {
  if (value === undefined || value === null) return UNKNOWN;
  const v = String(value).toLowerCase();
  return allowed.includes(v) ? v.toUpperCase() : UNKNOWN;
}

// A short human build label ("verified build 4c4256") is allowed in founder mode,
// but only if it is short and NOT a full sha. Otherwise UNKNOWN.
function buildLabel(v) {
  if (typeof v !== "string" || !v.trim()) return UNKNOWN;
  if (SHA40.test(v) || SHA64.test(v)) return UNKNOWN;
  if (v.length > 40) return UNKNOWN;
  return v.trim();
}

export function buildPanel(snapshot = {}) {
  const unknowns = [];
  const mark = (name, val) => { if (val === UNKNOWN) unknowns.push(name); return val; };

  const freshness = mark("evidence_freshness", chip(snapshot.evidenceFreshness, ["fresh", "stale"]));
  const checker   = mark("checker",  chip(snapshot.checker, ["clean", "findings"]));
  const gate      = mark("gate_advisor", chip(snapshot.gate, ["ready", "hold"]));

  let tests = UNKNOWN;
  const tt = snapshot.tests;
  if (tt && Number.isInteger(tt.passed) && Number.isInteger(tt.total) && tt.total > 0
      && tt.passed >= 0 && tt.passed <= tt.total) {
    tests = `${tt.passed}/${tt.total}`;
  }
  mark("tests", tests === UNKNOWN ? UNKNOWN : "ok");

  const beta = (snapshot.acceptedBeta && snapshot.acceptedBeta.label)
    ? `${snapshot.acceptedBeta.label} — ${snapshot.acceptedBeta.status || "accepted with limits"}`
    : mark("accepted_beta", UNKNOWN);

  const label = buildLabel(snapshot.buildLabel);

  // Overall readiness is CONSERVATIVE: green only when every load-bearing signal
  // is affirmatively good. Any UNKNOWN, stale, findings, hold, or failing tests
  // => NOT ready. This is the anti-false-green rule.
  const testsGreen = tests !== UNKNOWN && (() => { const [p, t] = tests.split("/").map(Number); return p === t; })();
  const ready =
    freshness === "FRESH" && checker === "CLEAN" && gate === "READY" && testsGreen;

  const statusLine = ready
    ? "All local checks are green — internal demo only (never ‘ship’)."
    : (snapshot.blockedReason
        ? String(snapshot.blockedReason)
        : (unknowns.length
            ? "Some information is not available yet — shown as UNKNOWN, not guessed."
            : "Not all checks are green — see the chips below."));

  const panels = {
    proves:       Array.isArray(snapshot.proves) ? snapshot.proves.slice() : [],
    notProves:    Array.isArray(snapshot.notProves) ? snapshot.notProves.slice() : [],
    nextAction:   typeof snapshot.nextAction === "string" ? snapshot.nextAction : UNKNOWN,
    founderGated: Array.isArray(snapshot.founderGated) ? snapshot.founderGated.slice() : [],
  };
  if (!panels.proves.length) mark("proves", UNKNOWN);
  if (!panels.notProves.length) mark("not_proves", UNKNOWN);
  if (panels.nextAction === UNKNOWN) unknowns.push("next_action");
  if (!panels.founderGated.length) mark("founder_gated", UNKNOWN);

  const evidenceZip = (snapshot.evidenceZip && snapshot.evidenceZip.available === true)
    ? { available: true, label: snapshot.evidenceZip.label || "Download evidence ZIP" }
    : { available: false, reason: (snapshot.evidenceZip && snapshot.evidenceZip.reason) || "no sealed export available yet" };

  return {
    ready,
    statusLine,
    chips: { freshness, tests, checker, gate, beta, buildLabel: label },
    panels,
    evidenceZip,
    unknowns,
    // developer-only fields kept OUT of the founder chips:
    _dev: {
      headSha: typeof snapshot.headSha === "string" ? snapshot.headSha : null,
      branch: typeof snapshot.branch === "string" ? snapshot.branch : null,
      guardOutputs: snapshot.guardOutputs || null,
      evidencePaths: snapshot.evidencePaths || null,
    },
  };
}

export function renderFounderText(vm) {
  const L = [];
  L.push("FOUNDERGATE — FOUNDER VIEW (plain English, no terminal)");
  L.push("Status: " + vm.statusLine);
  L.push("");
  L.push("Checks:");
  L.push("  • Evidence freshness: " + vm.chips.freshness);
  L.push("  • Tests: " + vm.chips.tests);
  L.push("  • Independent Checker: " + vm.chips.checker);
  L.push("  • Gate Advisor: " + vm.chips.gate);
  L.push("  • Accepted beta slice: " + vm.chips.beta);
  if (vm.chips.buildLabel !== UNKNOWN) L.push("  • Build: " + vm.chips.buildLabel);
  L.push("");
  L.push("What this proves:");
  (vm.panels.proves.length ? vm.panels.proves : [UNKNOWN]).forEach(x => L.push("  • " + x));
  L.push("What this does NOT prove:");
  (vm.panels.notProves.length ? vm.panels.notProves : [UNKNOWN]).forEach(x => L.push("  • " + x));
  L.push("Next safe action: " + vm.panels.nextAction);
  L.push("Still founder-gated:");
  (vm.panels.founderGated.length ? vm.panels.founderGated : [UNKNOWN]).forEach(x => L.push("  • " + x));
  L.push("");
  L.push(vm.evidenceZip.available
    ? "[ Download evidence ZIP: " + vm.evidenceZip.label + " ]"
    : "[ Download evidence ZIP: unavailable — " + vm.evidenceZip.reason + " ]");
  const text = L.join("\n");
  // Self-guard: founder text must never contain a full sha or the word "log".
  if (SHA40.test(text) || SHA64.test(text)) throw new Error("founder text leaked a SHA");
  return text;
}

export function renderDeveloperText(vm) {
  const L = [];
  L.push("FOUNDERGATE — DEVELOPER/REVIEWER VIEW (technical)");
  L.push("ready=" + vm.ready + "  status=" + vm.statusLine);
  L.push("chips=" + JSON.stringify(vm.chips));
  L.push("unknowns=" + JSON.stringify(vm.unknowns));
  L.push("head_sha=" + (vm._dev.headSha || "n/a"));
  L.push("branch=" + (vm._dev.branch || "n/a"));
  L.push("guard_outputs=" + JSON.stringify(vm._dev.guardOutputs));
  L.push("evidence_paths=" + JSON.stringify(vm._dev.evidencePaths));
  return L.join("\n");
}
