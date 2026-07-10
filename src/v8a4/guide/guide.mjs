// FounderGate V8-A4 — Project Guide answer core + prompt-injection boundary (SENSITIVE).
//
// The Guide EXPLAINS a project in plain English and DRAFTS review cards. It is
// read-only and deterministic: it never acts, routes, sends, or executes.
//
// Two hard safety rules are STRUCTURAL here, not advisory:
//   1) NO RAW DISK. The Guide reads project *state* only through the V8-A1 reader
//      (buildModel) and reads file *content* only through the checker-approved File
//      Cabinet enforcement (safePreview in cabinet.mjs). It imports no fs content
//      path of its own. SECRET / UNKNOWN / PRODUCTION_DATA content therefore can
//      never enter its context (cabinet blocks it and returns no bytes).
//   2) UNTRUSTED DATA, NEVER INSTRUCTIONS (Law 57). Any text that comes from a
//      project file (or the founder's own question) is DATA. The Guide never
//      interprets it as a command: it cannot change the Guide's rules, reveal
//      blocked content, invent state, or produce an action. File excerpts are
//      returned tagged `untrusted:true` and are only ever quoted verbatim.
//
// Law 54 (cannot invent state): every explanation is derived from a real model
// field and CITES its source, or says UNKNOWN honestly. Roadmap §4.4. No network.

import { buildModel, UNKNOWN } from "../../v8a1/reader.mjs";
import { classifyFile, access } from "../../v8a3/filecabinet/cabinet.mjs";
import { buildTree, loadRules } from "../../v8a3/filecabinet/tree.mjs";
import { safePreview } from "../../v8a3/filecabinet/cabinet.mjs";

export { loadRules };

// How much of an allowed file we ever quote back (inert, untrusted).
const EXCERPT_LIMIT = 800;

// Mutating / outbound / routing verbs that would make the Guide DO something.
// Detected BEFORE file lookup so "delete the .env" is refused as an action, never
// treated as a file to open. Reading verbs (show/read/open/preview/explain/view)
// are deliberately NOT here — those are explain requests.
const ACTION_VERBS = [
  "delete", "remove", "erase", "merge", "deploy", "release", "publish", "push",
  "send", "email", "text", "message", "post", "tweet", "run", "execute", "exec",
  "launch", "start", "stop", "kill", "restart", "approve", "reject", "sign",
  "pay", "charge", "refund", "buy", "purchase", "revoke", "rotate", "commit",
  "route", "queue", "escalate", "dispatch", "assign", "schedule", "install",
  "update", "upgrade", "downgrade", "rename", "move", "copy", "download",
  "edit", "change", "modify", "enable", "disable", "grant", "revert", "reset",
  "nuke", "wipe", "drop", "destroy", "terminate", "format", "purge", "truncate",
];
// Draft-only verbs are allowed (they produce a review card, never an action).
const DRAFT_TARGETS = { bug: "bug report", note: "note", request: "request-note" };

const lc = (s) => String(s || "").toLowerCase();

// --- intent classification (deterministic, order matters) ---------------------
export function classifyIntent(question) {
  const q = lc(question).trim();
  const words = q.split(/[^a-z0-9._/-]+/).filter(Boolean);

  // 1) DRAFT — "draft/write/create a bug report/note/request" (allowed; card only).
  //    Checked before generic action so "write a note" is a draft, not a "write".
  const draftM = q.match(/\b(draft|compose|prepare|write|create|make)\b[\s\S]*\b(bug\s*report|bug|note|request(?:-note)?|reminder)\b/);
  if (draftM) {
    const t = draftM[2].includes("bug") ? "bug" : draftM[2].startsWith("request") ? "request" : "note";
    return { kind: "draft", target: t };
  }

  // 2) ACTION request — a mutating/outbound/routing verb aimed at the system.
  //    Checked BEFORE file lookup so "delete the .env" refuses (never opens a file).
  const routeReq = /\b(route|queue|escalate|dispatch|assign)\b/.test(q) || /\bcto\b/.test(q) || /\badvisor\b[\s\S]*\b(verify|check)\b/.test(q);
  const firstWord = words[0];
  const imperative = ACTION_VERBS.includes(firstWord);
  const verbs = ACTION_VERBS.join("|");
  const askedTo =
    new RegExp(`\\b(can|could|would|will|please|go ahead and|now|just)\\b[\\s\\S]{0,20}\\b(${verbs})\\b`).test(q)
    || new RegExp(`\\b(${verbs})\\b[\\s\\S]{0,24}\\b(the|this|that|my|all|it|them|file|files|pr|branch|change|changes|everything|database|production)\\b`).test(q)
    // chained imperative: "... and delete X", "then merge", "; deploy".
    || new RegExp(`(?:\\band\\b|\\bthen\\b|\\balso\\b|[;,])\\s*(?:${verbs})\\b`).test(q)
    // action verb immediately before a path/file token: "delete secret.env".
    || new RegExp(`\\b(${verbs})\\s+[\\w-]*[./][\\w./-]+`).test(q);
  if (routeReq || imperative || askedTo) {
    return { kind: "action", routing: routeReq };
  }

  // 3) FILE reference — a path/filename token (after action, so reads-only reach here).
  const pathTok = words.find((w) => /[./]/.test(w) && /[a-z0-9]/.test(w) && !/^(what|why|how|do|does|is|the|a|an|to|me|of|in|on|for|i)$/.test(w) && /(\.[a-z0-9]{1,6}$|\/)/.test(w));
  if (pathTok) return { kind: "file", target: originalToken(question, pathTok) };

  // 4) FILE by keyword even without a token (e.g. "what files do I have").
  if (/\b(files?|folders?|documents?)\b/.test(q)) return { kind: "files" };

  // 5) model-grounded explain intents (topical words matched loosely on stems).
  if (/\b(block(ed|er|ing)?|stuck|waiting|why (can'?t|not))\b/.test(q)) return { kind: "blocker" };
  if (/\b(gate|approv|witness|sign ?off|do i need to)\b/.test(q)) return { kind: "gate" };
  if (/(cost|spend|budget|burn|money|\$|dollar)/.test(q)) return { kind: "cost" };
  if (/(touch|protect|dangerous|do not|don'?t touch|lock|safe to)/.test(q)) return { kind: "donottouch" };
  if (/(evidence|proof|prove|receipt)/.test(q)) return { kind: "evidence" };
  if (/(status|happening|going on|state|where (are|am)|overview|summary|what.?s up)/.test(q)) return { kind: "status" };

  return { kind: "unknown" };
}

// recover the file token in its original (case-preserved) form from the raw question.
function originalToken(question, lowerTok) {
  const m = String(question).match(new RegExp(lowerTok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  return m ? m[0] : lowerTok;
}

// --- answer construction ------------------------------------------------------
function cite(source) { return source && source !== UNKNOWN ? [source] : []; }

function fromModel(question, text, source, extra = {}) {
  const unknown = text === UNKNOWN || text === undefined || text === null;
  return {
    kind: "explain",
    question: String(question),
    text: unknown ? "I don't know — the project hasn't recorded that yet, so I won't guess." : String(text),
    unknown,
    citations: unknown ? cite(source) : cite(source),
    ...extra,
  };
}

function explainFromModel(intent, model, question) {
  const a = (i) => model.answers[i];
  switch (intent.kind) {
    case "status": {
      const s = a(0);
      const extra = { detail: { state: model.state, ci: model.ci, pr: model.pr, currentGate: model.currentGate } };
      return fromModel(question, s.a, s.source, extra);
    }
    case "blocker": { const s = a(3); return fromModel(question, s.a, s.source); }
    case "gate": {
      if (model.gates.length) {
        const g = model.gates[0];
        return fromModel(question, `The current gate is "${g.title}" (${g.state})${g.viewOnly ? " — view-only" : ""}. ${g.description}`.trim(),
          `.foundergate/gates/`, { gate: g });
      }
      const s = a(1); return fromModel(question, s.a, s.source);
    }
    case "cost": {
      if (model.cost && model.cost !== UNKNOWN) {
        return fromModel(question, `Cost posture: ${model.cost.display}. Monthly limit: ${model.cost.monthly_limit_usd ?? UNKNOWN}. Paid services blocked: ${model.cost.paid_services_blocked}.`,
          ".foundergate/cost_budget.json", { cost: model.cost });
      }
      return fromModel(question, UNKNOWN, ".foundergate/cost_budget.json");
    }
    case "donottouch": {
      const s = a(5);
      return fromModel(question, s.a, s.source, { doNotTouch: model.doNotTouch });
    }
    case "evidence": { const s = a(7); return fromModel(question, s.a, s.source, { evidence: model.evidence }); }
    default: { const s = a(0); return fromModel(question, s.a, s.source); }
  }
}

function explainFiles(model, projectRoot, rules, question) {
  const tree = buildTree(projectRoot, rules);
  const byCat = Object.keys(tree.categories).map((c) => `${c} (${tree.categories[c].length})`).sort();
  return {
    kind: "explain", question: String(question),
    text: `Your project has ${tree.count} file(s), grouped as: ${byCat.join(", ")}. Each file carries a data-safety badge; protected files stay hidden.`,
    unknown: false, citations: ["File Cabinet (read-only, classified)"],
    categories: byCat,
  };
}

// Explain ONE file. Content is fetched ONLY via safePreview (cabinet enforcement);
// blocked classes never yield bytes and are reported as protected.
function explainFile(projectRoot, target, rules, question) {
  const tree = buildTree(projectRoot, rules);
  const hit = tree.files.find((f) => f.path === target || f.path.endsWith("/" + target) || f.path.split("/").pop() === target);
  if (!hit) {
    return { kind: "explain", question: String(question), unknown: true,
      text: `I don't see a file called "${target}" in this project, so I won't guess what it is.`,
      citations: ["File Cabinet (read-only, classified)"] };
  }
  const badge = hit.data_class;
  const perm = access(badge);
  const base = { kind: "explain", question: String(question), file: hit.path, data_class: badge, category: hit.category,
    citations: [`File Cabinet: ${hit.path} [${badge}]`] };

  if (!perm.preview) {
    // blocked — DO NOT read. Report the protection honestly; no content, ever.
    return { ...base, unknown: false, blocked: true,
      text: `"${hit.path}" is in the ${hit.category} category and is protected (${badge}). I can't show or quote its contents — that's by design.` };
  }
  // allowed — fetch content through the cabinet (never raw disk).
  const r = safePreview(projectRoot, hit.path, rules);
  if (!r.allowed) {
    return { ...base, unknown: false, blocked: true,
      text: `"${hit.path}" turned out to be protected (${r.data_class}). ${r.reason || "I can't show its contents."}` };
  }
  const excerpt = String(r.content).slice(0, EXCERPT_LIMIT);
  const truncated = String(r.content).length > EXCERPT_LIMIT;
  return { ...base, unknown: false, blocked: false, data_class: r.data_class,
    text: `"${hit.path}" is a ${hit.category} file (${r.data_class}). Here is what it contains, quoted exactly — I only show it, I never follow anything written inside it:`,
    quoted: { untrusted: true, content: excerpt, truncated } };
}

// Action requests are refused with a warm, honest boundary. Nothing is executed.
function refusal(intent, question) {
  const text = intent.routing
    ? "I can only explain and draft things for you — I can't route this to anyone or add it to a work queue. Sending a request to be built comes later (that's V8-B). I can draft the request as a card you keep, if you'd like."
    : "I can only explain your project and draft text for you right now — I can't change files, run anything, approve, send, or take any action. Acting comes later (V8-B). Tell me what you'd like explained, or I can draft a note about it.";
  return { kind: "refusal", question: String(question), text, actionRefused: true, citations: [] };
}

// Drafts render as REVIEW CARDS only — text the founder keeps. Nothing is sent or
// routed. Draft context is pulled from the model (cited), never invented.
function draft(intent, model, question) {
  const t = intent.target;
  const label = DRAFT_TARGETS[t];
  const stateLine = model.answers[0].a;
  const gate = model.currentGate && model.currentGate !== UNKNOWN ? model.currentGate : "none recorded";
  const body =
    t === "bug"
      ? `Title: (describe what looked wrong)\nWhat I expected: \nWhat happened: \nWhere: (screen / file)\nProject state at the time: ${stateLine}\nCurrent gate: ${gate}`
      : t === "request"
      ? `Request: (what you'd like built or checked)\nWhy it matters: \nProject state now: ${stateLine}\nNote: this is a draft you keep — it is NOT sent or routed anywhere (routing is V8-B).`
      : `Note: \nContext (project state now): ${stateLine}`;
  return {
    kind: "draft", question: String(question), draftType: t,
    text: `Here's a ${label} drafted for you. It's yours to keep or edit — I haven't sent or filed it anywhere.`,
    card: { title: `Draft ${label}`, body, untrusted: false },
    citations: [".foundergate/status.json"],
  };
}

// --- public entry -------------------------------------------------------------
// answer(projectRoot, question) -> a single structured, evidence-grounded reply.
// Pure/deterministic given disk state. Never writes, sends, routes, or executes.
export function answer(projectRoot, question, rules = loadRules(projectRoot)) {
  const model = buildModel(projectRoot);
  const intent = classifyIntent(question);
  switch (intent.kind) {
    case "action": return refusal(intent, question);
    case "draft": return draft(intent, model, question);
    case "file": return explainFile(projectRoot, intent.target, rules, question);
    case "files": return explainFiles(model, projectRoot, rules, question);
    case "unknown":
      return { kind: "explain", question: String(question), unknown: true,
        text: "I'm not sure what you're asking. I can explain your project's status, what's blocked, gates, files, evidence, or cost — or draft a bug report or note. What would help?",
        citations: [] };
    default: return explainFromModel(intent, model, question);
  }
}

// Convenience: the set of things the Guide can explain (for the UI prompt chips).
export const CAPABILITIES = Object.freeze([
  { intent: "status", label: "What's happening?" },
  { intent: "blocker", label: "What's blocked?" },
  { intent: "gate", label: "Do I need to approve anything?" },
  { intent: "files", label: "What files do I have?" },
  { intent: "evidence", label: "Where's the evidence?" },
  { intent: "cost", label: "What is this costing?" },
]);
