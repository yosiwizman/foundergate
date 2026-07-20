// FounderGate LRCQ — canonical provider-session identity envelope + non-recursive prompt contract
// (FG-LRCQ-ACT-009). Every required identity + output-binding value is rendered DIRECTLY into the
// real builder/checker prompt; the worker echoes prompt_contract_digest. There is NO identity.json
// side channel — the (stub or real) worker obtains its identity ONLY from the rendered prompt.
import { createHash } from "node:crypto";

export const IDENTITY_ENVELOPE_SCHEMA = "lrcq-identity-envelope-1";
export const IDENTITY_FIELDS = [
  "schema", "role", "run_id", "job_id", "attempt", "session_id", "candidate_sha", "candidate_tree",
  "backlog_digest", "resolved_plan_digest", "branch", "worktree", "lease_id", "lease_digest",
  "allowed_tools_digest", "denied_tools_digest", "evidence_path", "deadline_epoch", "session_cost_cap_usd",
];
const sha = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");
// canonical serialization (sorted keys) — stable across key order
function canon(v) { if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]"; if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}"; return JSON.stringify(v === undefined ? null : v); }

export function buildIdentityEnvelope(f) {
  const env = { schema: IDENTITY_ENVELOPE_SCHEMA, role: f.role, run_id: f.run_id, job_id: f.job_id, attempt: f.attempt, session_id: f.session_id, candidate_sha: f.candidate_sha, candidate_tree: f.candidate_tree, backlog_digest: f.backlog_digest, resolved_plan_digest: f.resolved_plan_digest, branch: f.branch, worktree: f.worktree, lease_id: f.lease_id, lease_digest: f.lease_digest, allowed_tools_digest: f.allowed_tools_digest, denied_tools_digest: f.denied_tools_digest, evidence_path: f.evidence_path, deadline_epoch: f.deadline_epoch, session_cost_cap_usd: f.session_cost_cap_usd };
  if (f.role === "checker") { env.builder_transaction_id = f.builder_transaction_id; env.machine_verifier_report_digest = f.machine_verifier_report_digest; }
  return env;
}
export function validateEnvelope(env) {
  const r = []; for (const k of IDENTITY_FIELDS) if (env[k] === undefined || env[k] === null || env[k] === "") r.push("missing " + k);
  if (env.schema !== IDENTITY_ENVELOPE_SCHEMA) r.push("wrong schema");
  if (env.role === "checker") for (const k of ["builder_transaction_id", "machine_verifier_report_digest"]) if (!env[k]) r.push("checker missing " + k);
  return { valid: r.length === 0, refusals: r };
}
// NON-RECURSIVE contract: digest over {identity, instructions} BEFORE rendering. The rendered
// prompt embeds this digest; the digest never depends on the final rendered text.
export function promptContractDigest(env, instructions) { return sha(canon({ identity: env, instructions })); }
export function renderPrompt(env, instructions) {
  const pcd = promptContractDigest(env, instructions);
  return [
    "=== FOUNDERGATE LRCQ SESSION IDENTITY (echo prompt_contract_digest in your output) ===",
    "prompt_contract_digest: " + pcd,
    "IDENTITY: " + JSON.stringify(env),
    "=== INSTRUCTIONS ===",
    instructions,
    "=== REQUIRED OUTPUT ===",
    "Emit ONE JSON object echoing role/run_id/job_id/attempt/session_id/prompt_contract_digest exactly as above.",
  ].join("\n");
}
export function renderedPromptDigest(promptText) { return sha(promptText); } // separate, evidence-only
// The worker (stub or real) reads its identity from the rendered prompt — NOT from a side channel.
export function parseIdentityFromPrompt(promptText) {
  const mPcd = promptText.match(/prompt_contract_digest:\s*(sha256:[0-9a-f]{64})/);
  const mId = promptText.match(/IDENTITY:\s*(\{.*\})/);
  if (!mId) return null;
  try { return { identity: JSON.parse(mId[1]), prompt_contract_digest: mPcd ? mPcd[1] : null }; } catch { return null; }
}
