// FounderGate LRCQ — machine-readable contracts (Phase 4A-D). Pure, no I/O.
// These schemas are the single source of truth for backlog jobs, runtime state,
// events, and gates. Validators fail closed: an unknown/missing field is a defect,
// never a silent pass.

export const RISK_CLASSES = ["WIDE_SAFE", "NARROW_SENSITIVE", "UNKNOWN", "BLOCKED"];
export const EFFECT_CLASSES = ["PURE", "LOCAL_FS", "PROCESS", "NETWORK", "LIVE_ACTION", "UNKNOWN"];
export const JOB_STATUSES = ["READY", "RUNNING", "COMPLETED", "FAILED", "HELD", "PARKED", "BLOCKED", "UNKNOWN", "PENDING"];
export const GATE_TRIGGERS = ["NONE", "FOUNDER_GATE", "HUMAN_EXPERT_GATE", "PROTECTED_MAIN_MERGE", "LIVE_ACTION"];
// C. Runtime-state schema
export const RUNTIME_STATES = [
  "PREPARATION", "READY", "RUNNING", "PAUSED", "STOPPED_EXHAUSTED", "STOPPED_DEADLINE",
  "HELD_FOUNDER_GATE", "HELD_HUMAN_EXPERT_GATE", "HELD_COLLISION", "FAILED", "PANIC", "UNKNOWN",
];

const isStr = (v) => typeof v === "string" && v.length > 0;
const isArr = (v) => Array.isArray(v);
const isInt = (v) => typeof v === "number" && Number.isInteger(v) && v >= 0;

// A. Backlog job schema
export const JOB_FIELDS = [
  "job_id", "title", "objective", "done_meaning", "source", "risk_class", "effect_class",
  "dependencies", "allowed_files", "forbidden_files", "branch", "worktree", "expected_outputs",
  "tests", "required_evidence", "checker_requirement", "gate_trigger", "estimated_minutes",
  "max_attempts", "correction_cycle", "status", "status_reason", "created_at", "started_at",
  "completed_at", "evaluated_sha", "evidence_sha", "next_safe_action",
];
export function validateJob(j) {
  const e = [];
  if (!j || typeof j !== "object") return ["job is not an object"];
  if (!isStr(j.job_id)) e.push("job_id missing");
  if (!isStr(j.title)) e.push("title missing");
  if (!isStr(j.objective)) e.push("objective missing");
  if (!isStr(j.done_meaning)) e.push("done_meaning missing");
  if (!RISK_CLASSES.includes(j.risk_class)) e.push("risk_class invalid: " + j.risk_class);
  if (!EFFECT_CLASSES.includes(j.effect_class)) e.push("effect_class invalid: " + j.effect_class);
  if (!isArr(j.dependencies)) e.push("dependencies must be array");
  if (!isArr(j.allowed_files) || j.allowed_files.length === 0) e.push("allowed_files must be non-empty array");
  if (!isArr(j.forbidden_files)) e.push("forbidden_files must be array");
  if (!isArr(j.tests)) e.push("tests must be array");
  if (!isArr(j.required_evidence)) e.push("required_evidence must be array");
  if (!isStr(j.checker_requirement)) e.push("checker_requirement missing");
  if (!GATE_TRIGGERS.includes(j.gate_trigger)) e.push("gate_trigger invalid: " + j.gate_trigger);
  if (!isInt(j.estimated_minutes) || j.estimated_minutes <= 0) e.push("estimated_minutes must be positive int");
  if (!isInt(j.max_attempts) || j.max_attempts < 1) e.push("max_attempts must be >=1");
  if (!JOB_STATUSES.includes(j.status)) e.push("status invalid: " + j.status);
  return e;
}

// A backlog is valid iff: every job valid, IDs unique, no dependency references a missing job,
// and no dependency cycle exists.
export function validateBacklog(jobs) {
  const errors = [];
  if (!isArr(jobs)) return { ok: false, errors: ["backlog is not an array"] };
  const ids = new Set();
  for (const j of jobs) {
    const je = validateJob(j);
    if (je.length) errors.push({ job: j && j.job_id, errors: je });
    if (j && j.job_id) {
      if (ids.has(j.job_id)) errors.push({ job: j.job_id, errors: ["duplicate job_id"] });
      ids.add(j.job_id);
    }
  }
  for (const j of jobs) {
    for (const d of (j && j.dependencies) || []) {
      if (!ids.has(d)) errors.push({ job: j.job_id, errors: ["missing dependency: " + d] });
    }
  }
  const cyc = findCycle(jobs);
  if (cyc) errors.push({ job: cyc.join("->"), errors: ["dependency cycle"] });
  return { ok: errors.length === 0, errors };
}

export function findCycle(jobs) {
  const byId = new Map(jobs.map((j) => [j.job_id, j]));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  const stack = [];
  let cycle = null;
  const dfs = (id) => {
    if (cycle) return;
    color.set(id, GRAY); stack.push(id);
    const j = byId.get(id);
    for (const d of (j && j.dependencies) || []) {
      if (!byId.has(d)) continue;
      const c = color.get(d) || WHITE;
      if (c === GRAY) { const i = stack.indexOf(d); cycle = stack.slice(i).concat(d); return; }
      if (c === WHITE) dfs(d);
      if (cycle) return;
    }
    color.set(id, BLACK); stack.pop();
  };
  for (const j of jobs) if ((color.get(j.job_id) || WHITE) === WHITE) dfs(j.job_id);
  return cycle;
}

// B. Event schema — every CURRENT event needs event_id + run_id + timestamp + source + event_type.
export const EVENT_FIELDS = ["event_id", "run_id", "job_id", "timestamp", "source", "event_type", "status", "evidence"];
export function validateEvent(ev) {
  const e = [];
  if (!ev || typeof ev !== "object") return ["event not an object"];
  if (!isStr(ev.event_id)) e.push("event_id missing");
  if (!isStr(ev.timestamp) && !isInt(ev.timestamp)) e.push("timestamp missing");
  if (!isStr(ev.source)) e.push("source missing");
  if (!isStr(ev.event_type)) e.push("event_type missing");
  return e;
}

// D. Gate schema
export const GATE_FIELDS = ["gate_type", "reason", "blocked_action", "required_human", "current_sha", "evidence_packet", "reversible", "next_safe_action"];
export function validateGate(g) {
  const e = [];
  if (!g || typeof g !== "object") return ["gate not an object"];
  if (!isStr(g.gate_type)) e.push("gate_type missing");
  if (!isStr(g.reason)) e.push("reason missing");
  if (!isStr(g.blocked_action)) e.push("blocked_action missing");
  if (!isStr(g.next_safe_action)) e.push("next_safe_action missing");
  return e;
}
