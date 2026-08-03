// FounderGate — Request→Template Registry (SINGLE SOURCE OF TRUTH, isomorphic: node + browser).
// This module is the ONLY place that decides which local template a typed idea binds to. The browser
// Idea Builder and the node manifest generator both import it, so the UI and the evidence cannot drift.
//
// Correction context: a prior false-green let ANY typed idea show DONE/PASS 13/13 and open the task
// planner (static JSON + hardcoded preview). The law now: a request binds to a supported deterministic
// template and its real artifact/tests/preview, OR it is UNSUPPORTED_LOCAL_TEMPLATE / HELD — never green.

// ---- deterministic, dependency-free string hash (FNV-1a, 32-bit) — identical in node and browser ----
export function requestHash(text) {
  let h = 0x811c9dc5;
  const s = String(text == null ? '' : text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

// ---- supported local templates (deterministic, local-only, synthetic) ----
export const TEMPLATES = {
  task_planner: {
    template_id: 'task_planner',
    label: 'Appointment / Task Planner',
    // Founder-natural wording for a local task/list/planner app. NOTE: unsafe integrations (real reminders,
    // calendar, email, accounts, billing, deploy, merge, PR#200) are caught by GATE/REFUSE BEFORE this match,
    // so broadening these patterns cannot bypass those guards.
    patterns: [
      /task planner/i, /appointment planner/i, /appointment/i, /\bplanner\b/i,
      /\bto-?do\b/i, /\bto do\b/i, /\btasks?\b/i,
      /\bchecklist\b/i, /\btask list\b/i, /\bsimple list\b/i, /\bappointment list\b/i, /\bto-?do list\b/i,
    ],
    generated_app_path: 'tests/generated_apps/wave9_appointment_task_planner',
    preview_url: '../../tests/generated_apps/wave9_appointment_task_planner/index.html',
    test_plan_id: 'task_planner.selftest',
    test_path: 'tests/generated_apps/wave9_appointment_task_planner/tests/planner.selftest.mjs',
  },
  calculator: {
    template_id: 'calculator',
    label: 'Calculator',
    patterns: [/calculator/i, /arithmetic/i, /\bcalculate\b/i],
    generated_app_path: 'tests/generated_apps/calculator',
    preview_url: '../../tests/generated_apps/calculator/index.html',
    test_plan_id: 'calculator.selftest',
    test_path: 'tests/generated_apps/calculator/tests/calculator.selftest.mjs',
  },
};
// Match order: calculator before task_planner (a "calculator" request must never fall through to planner).
const MATCH_ORDER = ['calculator', 'task_planner'];

// ---- protected-gate requests: real-world actions gated behind a founder authorization ----
const GATE = [
  [/\bdeploy|host|publish live|go live\b/i, 'deploy'],
  [/\bmerge\b/i, 'merge'],
  [/pr\s*#?\s*200/i, 'PR #200'],
];
// ---- real-world / integration requests we deliberately DO NOT build locally ----
const REFUSE = [
  [/calendar|google|gmail|apple|microsoft|outlook|icloud|oauth|account/i, 'real calendar/account'],
  [/\breal reminders?\b|reminder emails?|email reminders?|push notification|sms|text message/i, 'real reminders/notifications'],
  [/email (customers|users|people)|outreach|send (emails|invites)|emails? to (customers|users|people|clients)/i, 'outreach/email'],
  [/charge|bill(ing)?|payment|paywall|subscription|invoice/i, 'billing/payment'],
  [/production data|customer data|private data|real user data|\bprod\b/i, 'customer/production data'],
  [/security|compliance|soc\s?2|hipaa|saas|commercial(ly)? (ready|validated)|market validat/i, 'security/SaaS/commercial'],
  [/private repo/i, 'private repo'],
  [/\bcrm\b/i, 'CRM'],
];

// Strip NEGATED clauses ("no real calendar", "without accounts", "never deploy") so an idea that merely
// DISCLAIMS unsafe things is not misread as requesting them.
function stripNegations(text) {
  return String(text == null ? '' : text)
    .replace(/\b(no real|no|not|without|never|avoid|excluding|except)\b[^,.;\n]*/gi, ' ');
}

// isUnsafeRequest(text) → true only for real-world / protected-gate intent (calendar/account/email/billing/
// production data/security-SaaS/private repo/CRM, or deploy/merge/PR#200). NOT true merely because no
// Idea-Builder template matched — that distinction matters for the app factory, whose archetypes are safe
// local apps the Idea-Builder registry does not list.
export function isUnsafeRequest(text) {
  const t = stripNegations(text);
  for (const [re, label] of GATE) if (re.test(t)) return { unsafe: true, kind: 'HELD_REQUIRES_FOUNDER_GATE', label };
  for (const [re, label] of REFUSE) if (re.test(t)) return { unsafe: true, kind: 'UNSUPPORTED_LOCAL_TEMPLATE', label };
  return { unsafe: false, kind: 'SAFE', label: null };
}

// classifyRequest(text) → the binding decision. kinds:
//   SUPPORTED                    → template_id set; artifact/tests/preview bind to it
//   HELD_REQUIRES_FOUNDER_GATE   → protected real-world action; no DONE/PASS, no preview
//   UNSUPPORTED_LOCAL_TEMPLATE   → not a supported template (or a refused integration); no DONE/PASS
export function classifyRequest(text) {
  const request_text = String(text == null ? '' : text);
  const request_hash = requestHash(request_text);
  const base = { request_text, request_hash, request_id: 'req_' + request_hash };
  const t = stripNegations(request_text);

  for (const [re, label] of GATE) {
    if (re.test(t)) return { ...base, kind: 'HELD_REQUIRES_FOUNDER_GATE', template_id: null, reason: label + ' is a protected founder gate — not built locally.' };
  }
  for (const [re, label] of REFUSE) {
    if (re.test(t)) return { ...base, kind: 'UNSUPPORTED_LOCAL_TEMPLATE', template_id: null, reason: label + ' needs a separate founder authorization — not a supported local template.' };
  }
  for (const id of MATCH_ORDER) {
    const tpl = TEMPLATES[id];
    if (tpl.patterns.some((re) => re.test(t))) {
      return { ...base, kind: 'SUPPORTED', template_id: id, reason: 'Supported local template selected: ' + id, template: tpl };
    }
  }
  return { ...base, kind: 'UNSUPPORTED_LOCAL_TEMPLATE', template_id: null, reason: 'No supported local template matches this idea — not built.' };
}
