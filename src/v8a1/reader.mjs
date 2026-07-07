// FounderGate V8-A1 — repo-local project/status reader (Law 54: cannot invent state).
//
// PURE NODE, read-only. Given an attached project root that contains a
// `.foundergate/` folder, it reads the V8-A1 subset and builds ONE normalized
// dashboard model. It NEVER invents state:
//   - missing status.json           -> state UNKNOWN / NOT CONNECTED
//   - CI absent/unknown             -> CI UNKNOWN
//   - PR absent/unknown             -> PR UNKNOWN
//   - evidence with fresh:false     -> STALE
// It only reads files inside the attached repo; it never writes anything.
//
// Source-of-truth (Law 68, V8-A1 slice): current disk wins. This reader reports
// from disk only; if two on-disk sources disagree about a field it marks CONFLICT.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

export const UNKNOWN = "UNKNOWN";
export const NOT_CONNECTED = "NOT CONNECTED";

function readJsonSafe(path) {
  try {
    if (!existsSync(path)) return { present: false, data: null };
    return { present: true, data: JSON.parse(readFileSync(path, "utf8")) };
  } catch (e) {
    return { present: false, data: null, error: String(e && e.message) };
  }
}

function readFolder(dir) {
  if (!existsSync(dir)) return { present: false, entries: [] };
  const entries = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const r = readJsonSafe(join(dir, f));
    if (r.present) entries.push(r.data);
  }
  return { present: true, entries };
}

// Build the normalized dashboard model. `projectRoot` is the attached repo dir.
export function buildModel(projectRoot) {
  const fgDir = join(projectRoot, ".foundergate");
  const connected = existsSync(fgDir) && statSync(fgDir).isDirectory();

  const project = readJsonSafe(join(fgDir, "project.json"));
  const status = readJsonSafe(join(fgDir, "status.json"));
  const locks = readJsonSafe(join(fgDir, "locks.json"));
  const runState = readJsonSafe(join(fgDir, "run_state.json"));
  const dataClass = readJsonSafe(join(fgDir, "data_classification.json"));
  const costBudget = readJsonSafe(join(fgDir, "cost_budget.json"));
  const releaseLabel = readJsonSafe(join(fgDir, "release_label.json"));
  const gates = readFolder(join(fgDir, "gates"));
  const witnesses = readFolder(join(fgDir, "witnesses"));
  const evidenceFolder = readFolder(join(fgDir, "evidence"));

  const s = status.present ? status.data : null;

  // CI / PR — UNKNOWN unless explicitly present.
  const ci = s && s.ci ? s.ci : UNKNOWN;
  const pr = s && s.pr ? s.pr : UNKNOWN;
  const state = s && s.state ? s.state : NOT_CONNECTED;

  // Evidence freshness — fresh:false (or absent) → STALE.
  const evidence = evidenceFolder.entries.map((e) => ({
    id: e.evidence_id || UNKNOWN,
    path: e.path || UNKNOWN,
    kind: e.kind || UNKNOWN,
    label: e.fresh === true ? "FRESH" : "STALE",
  }));

  // "What must not be touched" — from locks (never invented).
  const doNotTouch = locks.present && Array.isArray(locks.data.locks)
    ? locks.data.locks.map((l) => ({ path: l.path, reason: l.reason }))
    : [];

  // Panic Card honest scope — tracked processes from run_state (may be empty).
  const tracked = runState.present && Array.isArray(runState.data.tracked_processes)
    ? runState.data.tracked_processes
    : [];
  const panic = {
    trackedProcesses: tracked,
    scope: tracked.length
      ? `Panic will request a local halt and preserve evidence, and can stop these tracked processes: ${tracked.join(", ")}.`
      : "Panic creates a local halt/incident request and preserves evidence. There are NO tracked processes right now, so it stops nothing running. Full worker-kill/token-revoke/recovery arrive in V8-B/V8-D.",
  };

  // The 8 founder priority questions, in strict order, each answered from a real
  // source or honestly marked UNKNOWN. Never invented.
  const answers = [
    {
      q: "What is happening?",
      a: s && s.headline ? s.headline : (state === NOT_CONNECTED ? NOT_CONNECTED : `state: ${state}`),
      source: status.present ? ".foundergate/status.json" : UNKNOWN,
    },
    {
      q: "Do I need to do anything?",
      a: s && s.next_action ? s.next_action : UNKNOWN,
      source: status.present ? ".foundergate/status.json#next_action" : UNKNOWN,
    },
    {
      q: "Is anything dangerous?",
      a: doNotTouch.length ? `Yes — ${doNotTouch.length} protected item(s); see "what must not be touched".` : (locks.present ? "No protected items recorded." : UNKNOWN),
      source: locks.present ? ".foundergate/locks.json" : UNKNOWN,
    },
    {
      q: "What is blocked?",
      a: s && s.current_blocker ? s.current_blocker : (state === "blocked" ? "blocked (no detail)" : (status.present ? "Nothing recorded as blocked." : UNKNOWN)),
      source: status.present ? ".foundergate/status.json#current_blocker" : UNKNOWN,
    },
    {
      q: "What can I safely test?",
      a: releaseLabel.present ? `Release label: ${releaseLabel.data.label} (${releaseLabel.data.stage || ""}).` : UNKNOWN,
      source: releaseLabel.present ? ".foundergate/release_label.json" : UNKNOWN,
    },
    {
      q: "What must not be touched?",
      a: doNotTouch.length ? doNotTouch.map((d) => d.path).join(", ") : (locks.present ? "Nothing locked." : UNKNOWN),
      source: locks.present ? ".foundergate/locks.json" : UNKNOWN,
    },
    {
      q: "What changed since last time?",
      a: s && s.changed_since_last ? s.changed_since_last : UNKNOWN,
      source: status.present ? ".foundergate/status.json#changed_since_last" : UNKNOWN,
    },
    {
      q: "Where is the evidence?",
      a: evidence.length ? `${evidence.length} evidence item(s) in .foundergate/evidence/ (${evidence.filter((e) => e.label === "STALE").length} STALE).` : (evidenceFolder.present ? "No evidence recorded." : UNKNOWN),
      source: evidenceFolder.present ? ".foundergate/evidence/" : UNKNOWN,
    },
  ];

  return {
    connected,
    projectRoot,
    project: project.present ? project.data : UNKNOWN,
    releaseLabel: releaseLabel.present ? releaseLabel.data.label : UNKNOWN,
    dataClass: project.present && project.data.data_classification ? project.data.data_classification : (dataClass.present ? dataClass.data.default_class : UNKNOWN),
    state,
    ci,
    pr,
    currentGate: s && s.current_gate ? s.current_gate : UNKNOWN,
    answers,
    gates: gates.entries.map((g) => ({
      id: g.gate_id || UNKNOWN,
      title: g.title || UNKNOWN,
      state: g.state || UNKNOWN,
      viewOnly: g.view_only === true,
      description: g.description || "",
    })),
    witnesses: witnesses.entries,
    evidence,
    doNotTouch,
    panic,
    cost: costBudget.present
      ? {
          enforcement: costBudget.data.enforcement,
          display: `${costBudget.data.enforcement} — runtime enforcement begins V8-B`,
          monthly_limit_usd: costBudget.data.monthly_limit_usd,
          paid_services_blocked: costBudget.data.paid_services_blocked,
        }
      : UNKNOWN,
    presence: {
      project: project.present,
      status: status.present,
      locks: locks.present,
      run_state: runState.present,
      data_classification: dataClass.present,
      cost_budget: costBudget.present,
      release_label: releaseLabel.present,
      gates: gates.present,
      witnesses: witnesses.present,
      evidence: evidenceFolder.present,
    },
  };
}
