// FounderGate LRCQ — strict role-specific provider stdout schemas (FG-LRCQ-ACT-005/006).
// The provider's parsed stdout is validated + EXACTLY bound to run/job/attempt/session/prompt.
// Unvalidated arbitrary output is never exposed as authority. Wrong role/job/attempt/session/
// prompt -> FAILED / INSUFFICIENT_EVIDENCE.
export const BUILDER_OUTPUT_SCHEMA = "lrcq-builder-output-1";
export const CHECKER_OUTPUT_SCHEMA = "lrcq-checker-output-1";
export const CHECKER_VERDICTS = ["CLEAN", "FINDINGS", "INSUFFICIENT_EVIDENCE"];

const REQ = (obj, fields) => fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === "");

// bind = { run_id, job_id, attempt, session_id, prompt_digest }
export function validateBuilderOutput(out, bind) {
  const r = []; if (!out || typeof out !== "object") return { valid: false, refusals: ["builder output absent"] };
  r.push(...REQ(out, ["schema", "role", "run_id", "job_id", "attempt", "session_id", "prompt_digest", "outcome"]).map((f) => "missing " + f));
  if (out.schema !== BUILDER_OUTPUT_SCHEMA) r.push("wrong schema");
  if (out.role !== "builder") r.push("wrong role (expected builder)");
  if (!Array.isArray(out.changed_files)) r.push("changed_files must be an array");
  if (!Array.isArray(out.tests_requested)) r.push("tests_requested must be an array");
  if (bind) { if (out.run_id !== bind.run_id) r.push("run_id mismatch"); if (out.job_id !== bind.job_id) r.push("job_id mismatch"); if (out.attempt !== bind.attempt) r.push("attempt mismatch"); if (bind.session_id && out.session_id !== bind.session_id) r.push("session mismatch"); if (bind.prompt_digest && out.prompt_digest !== bind.prompt_digest) r.push("prompt digest mismatch"); }
  return { valid: r.length === 0, refusals: r };
}

export function validateCheckerOutput(out, bind) {
  const r = []; if (!out || typeof out !== "object") return { valid: false, refusals: ["checker output absent"] };
  r.push(...REQ(out, ["schema", "role", "run_id", "job_id", "attempt", "checker_session_id", "checker_prompt_digest", "reviewed_builder_transaction_id", "reviewed_machine_verifier_digest", "verdict"]).map((f) => "missing " + f));
  if (out.schema !== CHECKER_OUTPUT_SCHEMA) r.push("wrong schema");
  if (out.role !== "checker") r.push("wrong role (expected checker)");
  if (!CHECKER_VERDICTS.includes(out.verdict)) r.push("invalid verdict");
  if (!Array.isArray(out.criteria) || out.criteria.length === 0) r.push("empty criteria checklist");
  else for (const c of out.criteria) { if (!c.criterion_id || !c.result || !["PASS", "FAIL"].includes(c.result)) r.push("malformed criterion"); }
  // a CLEAN verdict requires every criterion PASS
  if (out.verdict === "CLEAN" && Array.isArray(out.criteria) && out.criteria.some((c) => c.result !== "PASS")) r.push("CLEAN with a failing criterion");
  if (bind) { if (out.run_id !== bind.run_id) r.push("run_id mismatch"); if (out.job_id !== bind.job_id) r.push("job_id mismatch"); if (out.attempt !== bind.attempt) r.push("attempt mismatch"); if (bind.session_id && out.checker_session_id !== bind.session_id) r.push("checker session mismatch"); if (bind.prompt_digest && out.checker_prompt_digest !== bind.prompt_digest) r.push("checker prompt digest mismatch"); if (bind.builder_transaction_id && out.reviewed_builder_transaction_id !== bind.builder_transaction_id) r.push("reviewed builder tx mismatch"); if (bind.machine_verifier_digest && out.reviewed_machine_verifier_digest !== bind.machine_verifier_digest) r.push("reviewed MV digest mismatch"); }
  return { valid: r.length === 0, refusals: r, verdict: out.verdict };
}
