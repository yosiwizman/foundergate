// V1 Golden Path — founder-visible run lifecycle for the LOCAL non-provider path.
// Provider status is NOT_ACTIVATED unless the founder explicitly authorized it; when a
// step needs the real provider, a clear founder GATE is shown. Never invents RUNNING/COMPLETED.
export const UNKNOWN = "UNKNOWN";
export const STATES = ["NOT_STARTED","READY_FOR_AUTHORIZATION","RUNNING_STUB","HELD","FAILED","COMPLETED","UNKNOWN"];
const esc = (s) => (s == null ? UNKNOWN : String(s).replace(/[\x00-\x1f\x7f]+/g," ").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])));
export function buildRunLifecycle({ contract = {}, state, providerAuthorized = false, requiresProvider = false } = {}) {
  const s = STATES.includes(state) ? state : UNKNOWN;
  const provider_status = providerAuthorized ? "ACTIVATED_BY_FOUNDER" : "NOT_ACTIVATED";
  const founder_gate = (requiresProvider && !providerAuthorized)
    ? "FOUNDER GATE: real-provider activation required to proceed — NOT activated. Awaiting explicit founder authorization."
    : null;
  return Object.freeze({
    run_id: esc(contract.run_id),
    deadline: contract.deadline_utc ? esc(contract.deadline_utc) : UNKNOWN,
    budget_usd: (typeof contract.budget_usd === "number") ? contract.budget_usd : UNKNOWN,
    state: s,
    provider_status,
    pausable: s === "RUNNING_STUB",
    stop_condition: contract.stop_condition ? esc(contract.stop_condition) : UNKNOWN,
    founder_gate,
    note: "local stub lifecycle — no real provider invoked",
  });
}
export function renderRunLifecycleText(v) {
  const L = [];
  L.push("== LIVE RUN CONSOLE (local stub) ==");
  L.push(`run_id: ${v.run_id}`); L.push(`deadline: ${v.deadline}`); L.push(`budget_usd: ${v.budget_usd}`);
  L.push(`state: ${v.state}`); L.push(`provider: ${v.provider_status}`); L.push(`pausable: ${v.pausable}`);
  L.push(`stop_condition: ${v.stop_condition}`);
  if (v.founder_gate) L.push(v.founder_gate);
  L.push(v.note);
  return L.join("\n");
}
