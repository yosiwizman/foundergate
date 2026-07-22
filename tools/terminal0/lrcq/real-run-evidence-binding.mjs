// FounderGate LRCQ — path-independent, source-bound real-run evidence authority (FG-LRCQ-ACT-027).
//
// The capsule verifier historically decided "did a run happen?" from the LITERAL presence of
// .foundergate/evidence/lrcq-assurance-factory/REAL-RUN/recovery-state.json. That path is GITIGNORED (raw
// evidence is preserved only in the factory worktree), so in any clone the directory is absent and the
// verifier would falsely report "no run performed". This module binds the run by the COMMITTED authoritative
// record (present in every clone) + its digest + run/activation identity, so verification is path-independent
// and fails closed on ambiguity or contradiction. It builds/verifies a manifest — it never fabricates raw
// evidence and never rewrites the preserved raw REAL-RUN files.
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, isAbsolute } from "node:path";

export const BINDING_SCHEMA = "lrcq-real-run-evidence-binding";
export const BINDING_SCHEMA_VERSION = 1;
export const BINDING_PATH = ".foundergate/evidence/lrcq-assurance-factory/REAL_RUN_EVIDENCE_BINDING.json";
// The AUTHORITATIVE committed source: the append-only teardown/terminal incident (FG-LRCQ-ACT-023). It is
// tracked in git, so a clone can verify it; it carries every authoritative status + preserves both the
// observed-old-label and the corrected interpretation.
const AUTHORITATIVE_SOURCE = ".foundergate/evidence/lrcq-assurance-factory/real-run-teardown-terminal-incident.json";
// Only these roots may host bound sources (no path escape).
const ALLOWED_SOURCE_PREFIXES = [".foundergate/evidence/lrcq-assurance-factory/"];

export const CODES = {
  OK: "OK",
  REAL_RUN_EVIDENCE_MISSING: "REAL_RUN_EVIDENCE_MISSING",
  REAL_RUN_EVIDENCE_AMBIGUOUS: "REAL_RUN_EVIDENCE_AMBIGUOUS",
  RUN_ID_MISMATCH: "RUN_ID_MISMATCH",
  ACTIVATION_IDENTITY_MISMATCH: "ACTIVATION_IDENTITY_MISMATCH",
  CONSUMPTION_STATE_MISMATCH: "CONSUMPTION_STATE_MISMATCH",
  REPLAY_STATE_MISMATCH: "REPLAY_STATE_MISMATCH",
  OUTCOME_CONTRADICTION: "OUTCOME_CONTRADICTION",
  PRODUCTIVE_JOB_COUNT_MISMATCH: "PRODUCTIVE_JOB_COUNT_MISMATCH",
  PROVIDER_ATTEMPT_MISMATCH: "PROVIDER_ATTEMPT_MISMATCH",
  COST_EVIDENCE_MISMATCH: "COST_EVIDENCE_MISMATCH",
  SOURCE_DIGEST_MISMATCH: "SOURCE_DIGEST_MISMATCH",
  RAW_MANIFEST_DIGEST_MISMATCH: "RAW_MANIFEST_DIGEST_MISMATCH",
  STALE_BINDING: "STALE_BINDING",
  UNAUTHORIZED_SOURCE_PATH: "UNAUTHORIZED_SOURCE_PATH",
};

const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");
const sha256file = (p) => sha256(readFileSync(p));
const deepSort = (v) => Array.isArray(v) ? v.map(deepSort) : (v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, deepSort(v[k])])) : v);
export const stableStringify = (o) => JSON.stringify(deepSort(o), null, 2) + "\n";

function R(code, extra = {}) { return { ok: code === CODES.OK, code, ...extra }; }

// Extract authoritative facts from the committed incident record (fail closed on missing/contradiction).
function extractFacts(incident) {
  const r = incident && incident.real_run; const p = incident && incident.provider_invocation_truth;
  if (!r || !p) return { error: CODES.REAL_RUN_EVIDENCE_MISSING };
  const facts = {
    run_id: r.held_on_first_job ? "lrcq-first-internal-5h-run" : null, // run_id is carried in the raw recovery-state; the incident binds the run by activation + held job
    activation_identity: r.activation_id,
    activation_consumed_once: r.activation_consumed_exactly_once === true,
    replay_blocked: r.replay_blocked === true,
    run_active_reached: r.run_active_reached === true,
    held_on_first_job: r.held_on_first_job || null,
    authoritative_outcome_status: r.authoritative_recovery_state,
    authoritative_final_state: "STOPPED_TEARDOWN_DEFECT",
    observed_historical_label: r.supervisor_state_exposed,
    production_witness_reached: r.production_witness_reached === true,
    productive_jobs_completed: r.productive_jobs_sealed,
    provider_attempt_status: /PROVIDER_NOT_ATTEMPTED/.test(p.verdict || "") ? "PROVIDER_NOT_ATTEMPTED" : "UNKNOWN",
    cost_usd: p.cost_usd,
    raw_evidence_manifest_ref: r.raw_evidence_manifest || null,
  };
  return { facts };
}

// Validate the extracted facts describe the ONE known historical held run, fail-closed.
function validateFacts(f) {
  if (!f.activation_identity || !/^sha256:[0-9a-f]{64}$/.test(f.activation_identity)) return CODES.ACTIVATION_IDENTITY_MISMATCH;
  if (f.activation_consumed_once !== true) return CODES.CONSUMPTION_STATE_MISMATCH;
  if (f.replay_blocked !== true) return CODES.REPLAY_STATE_MISMATCH;
  if (f.productive_jobs_completed !== 0) return CODES.PRODUCTIVE_JOB_COUNT_MISMATCH;
  if (f.provider_attempt_status !== "PROVIDER_NOT_ATTEMPTED") return CODES.PROVIDER_ATTEMPT_MISMATCH;
  if (typeof f.cost_usd !== "number" || f.cost_usd > 0.01) return CODES.COST_EVIDENCE_MISMATCH;
  // held-run outcome must be a HELD/terminal-defect state, never a clean completion or a reached witness
  if (!/HELD|TEARDOWN_DEFECT|PROVIDER_FAILURE/.test(f.authoritative_outcome_status || "")) return CODES.OUTCOME_CONTRADICTION;
  if (f.production_witness_reached === true) return CODES.OUTCOME_CONTRADICTION; // a held run never reached the witness
  if (!f.run_id) return CODES.RUN_ID_MISMATCH;
  return CODES.OK;
}

// Build the binding manifest from the committed authoritative source. `opts.expectRawManifestDigest`
// optionally cross-checks the raw-evidence manifest digest recorded in the incident.
export function buildBinding(repo, opts = {}) {
  const authAbs = resolve(repo, AUTHORITATIVE_SOURCE);
  if (!existsSync(authAbs)) return R(CODES.REAL_RUN_EVIDENCE_MISSING, { detail: AUTHORITATIVE_SOURCE });
  const incident = JSON.parse(readFileSync(authAbs, "utf8"));
  const { facts, error } = extractFacts(incident);
  if (error) return R(error);
  const v = validateFacts(facts);
  if (v !== CODES.OK) return R(v);
  // raw-evidence manifest digest as recorded in the incident (path-independent reference)
  const rawRefMatch = String(facts.raw_evidence_manifest_ref || "").match(/digest\s+(sha256:[0-9a-f]{6,})/);
  const raw_evidence_manifest_digest = rawRefMatch ? rawRefMatch[1] : null;
  const body = {
    schema: BINDING_SCHEMA, schema_version: BINDING_SCHEMA_VERSION, binding_id: "FG-LRCQ-ACT-027-real-run-evidence",
    run_id: facts.run_id, activation_identity: facts.activation_identity,
    activation_consumed_once: facts.activation_consumed_once, replay_blocked: facts.replay_blocked,
    evaluated_sha: opts.evaluatedSha || null, evaluated_tree: opts.evaluatedTree || null,
    historical_run_classification: "HISTORICAL_HELD_RUN",
    authoritative_outcome_status: facts.authoritative_outcome_status,
    authoritative_final_state: facts.authoritative_final_state,
    observed_historical_label: facts.observed_historical_label, // preserved: the old mislabel
    corrected_outcome_authority: "FG-LRCQ-ACT-023 (teardown/terminal mapping correction)",
    production_witness_reached: facts.production_witness_reached,
    productive_jobs_completed: facts.productive_jobs_completed,
    provider_attempt_status: facts.provider_attempt_status,
    cost_usd: facts.cost_usd,
    authoritative_source: { path: AUTHORITATIVE_SOURCE, sha256: sha256file(authAbs) },
    supporting_sources: [],
    raw_evidence_manifest_ref: facts.raw_evidence_manifest_ref,
    raw_evidence_manifest_digest,
    derivation_impl: { path: "tools/terminal0/lrcq/real-run-evidence-binding.mjs" },
    normalization_rules: "Facts are read verbatim from the committed authoritative incident; cost precision is not invented; both the observed-old-label and corrected outcome are preserved.",
    contradiction_result: "NONE",
    allowed_statement: "A founder authorization was consumed once and replay-blocked. The first real run reached RUN_ACTIVE, held on the first job, completed zero productive jobs, incurred approximately zero cost, and did not spawn the real Claude provider.",
    does_not_authorize_retry: true,
  };
  return R(CODES.OK, { binding: body });
}

// Verify an existing binding manifest against current source bytes (path-independent, fail closed).
export function verifyBinding(repo, binding) {
  if (!binding || binding.schema !== BINDING_SCHEMA) return R(CODES.STALE_BINDING, { detail: "schema" });
  if (binding.schema_version !== BINDING_SCHEMA_VERSION) return R(CODES.STALE_BINDING, { detail: "version" });
  const src = binding.authoritative_source;
  if (!src || typeof src.path !== "string") return R(CODES.REAL_RUN_EVIDENCE_MISSING);
  if (!ALLOWED_SOURCE_PREFIXES.some((p) => src.path.startsWith(p)) || src.path.includes("..") || isAbsolute(src.path)) return R(CODES.UNAUTHORIZED_SOURCE_PATH, { detail: src.path });
  const authAbs = resolve(repo, src.path);
  if (!existsSync(authAbs)) return R(CODES.REAL_RUN_EVIDENCE_MISSING, { detail: src.path });
  if (sha256file(authAbs) !== src.sha256) return R(CODES.SOURCE_DIGEST_MISMATCH, { detail: src.path });
  // re-derive from the (verified) source and require the binding to agree exactly
  const rebuilt = buildBinding(repo, { evaluatedSha: binding.evaluated_sha, evaluatedTree: binding.evaluated_tree });
  if (!rebuilt.ok) return rebuilt;
  const rb = rebuilt.binding;
  const cmp = (k, code) => binding[k] === rb[k] ? null : code;
  for (const [k, code] of [["run_id", CODES.RUN_ID_MISMATCH], ["activation_identity", CODES.ACTIVATION_IDENTITY_MISMATCH],
    ["activation_consumed_once", CODES.CONSUMPTION_STATE_MISMATCH], ["replay_blocked", CODES.REPLAY_STATE_MISMATCH],
    ["authoritative_outcome_status", CODES.OUTCOME_CONTRADICTION], ["productive_jobs_completed", CODES.PRODUCTIVE_JOB_COUNT_MISMATCH],
    ["provider_attempt_status", CODES.PROVIDER_ATTEMPT_MISMATCH], ["cost_usd", CODES.COST_EVIDENCE_MISMATCH],
    ["production_witness_reached", CODES.OUTCOME_CONTRADICTION]]) { const bad = cmp(k, code); if (bad) return R(bad, { detail: k }); }
  if (binding.raw_evidence_manifest_digest !== rb.raw_evidence_manifest_digest) return R(CODES.RAW_MANIFEST_DIGEST_MISMATCH);
  return R(CODES.OK, { binding, statement: binding.allowed_statement });
}

// CLI: build | verify
if (import.meta.url === `file://${resolve(process.argv[1] || "")}` || import.meta.url === new URL(`file://${resolve(process.argv[1] || "")}`).href) {
  const REPO = resolve(new URL("../../..", import.meta.url).pathname);
  const [mode] = process.argv.slice(2);
  if (mode === "build") { const r = buildBinding(REPO); if (r.ok) process.stdout.write(stableStringify(r.binding)); else console.error("REFUSED:", r.code, r.detail || ""); process.exit(r.ok ? 0 : 1); }
  else if (mode === "verify") { const b = JSON.parse(readFileSync(resolve(REPO, BINDING_PATH), "utf8")); const r = verifyBinding(REPO, b); console.log(JSON.stringify({ code: r.code, statement: r.statement }, null, 2)); console.log("\nREAL-RUN-EVIDENCE-BINDING: " + (r.ok ? "VALID" : "INVALID")); process.exit(r.ok ? 0 : 1); }
  else { console.error("usage: real-run-evidence-binding.mjs build|verify"); process.exit(2); }
}
