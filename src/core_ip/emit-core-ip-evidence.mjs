// Emit the P0 Core IP / Assumption / Environment evidence JSON + the UI panel data. LOCAL / DETERMINISTIC.
import * as C from './core-ip-primitives.mjs';
import * as A from '../assumption_verification/assumption-engine.mjs';
import { environmentIntegrity } from '../environment_integrity/environment-integrity.mjs';
import { executionIntegrity } from '../execution_integrity/execution-integrity.mjs';
import { monitorBoundaries } from '../boundary_monitoring/boundary-monitor.mjs';
import { containmentDecision } from '../containment/containment-decision.mjs';
import { computeEvidenceConfidence } from '../assurance_core/evidence-confidence.mjs';
import { aiAssuranceBundle } from '../assurance_core/ai-assurance-records.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUN_ID = 'p0_core_ip_assumption_env_verification_20260803T1915ET';

// --- assumption verification (10 local sample assumptions, all verified) ---
const assumptionPkg = A.packageAssumptions(A.sampleAssumptions());
// --- environment / execution integrity (all-local-good) ---
const env = environmentIntegrity({});
const exe = executionIntegrity({ observations: { process_integrity: 'intact', process_ownership: 'self_owned', runtime_capability: 'local_only', runtime_permission: 'least_privilege', credentials: 'none_present', secrets: 'no_secrets', filesystem: 'intact', mounts: 'expected_mounts', container: 'known', sandbox: 'local_synthetic_only' } });
// --- boundary monitoring (no drift) ---
const baseSnap = { network: 'blocked', process: 'p', tool: 'allowlist', permission: 'least', mount: 'm', secret: 'none', environment: 'e', runtime_policy: 'rp' };
const boundary = monitorBoundaries({ baseline: baseSnap, current: baseSnap });
// --- containment (derived) ---
const containment = containmentDecision({ assumption_action: assumptionPkg.package_action, environment_status: env.status, execution_status: exe.status, boundary_action: boundary.overall_action, pre_shutdown_evidence: 'n/a' });
// --- evidence confidence (evidence only) ---
const confidence = computeEvidenceConfidence({ artifact_verified: true, checker_verified: true, terminal_advisor_verified: false, runtime_evidence: true, environment_seal: env.environment_seal.sealed, context_snapshot: true, exact_state_binding: true, verified_assumptions: assumptionPkg.verified, stale_assumptions: assumptionPkg.stale, unknown_states: assumptionPkg.unknown, violations: assumptionPkg.violations });
// --- AI assurance bundle ---
const ai = aiAssuranceBundle({ config: { model_version: 'claude-opus-4-8[1m]', provider_version: 'simulated' }, context: { retrieved_documents: [{ id: 'p0_map', content: 'core-ip' }] }, threat: { approved: true }, eval: {}, model: {} });
// --- core-ip coverage ---
const coreIpImplemented = C.CORE_IP_FUNCTIONS.length; // 46

const evidence = {
  record_type: 'p0_core_ip_evidence', run_id: RUN_ID,
  core_ip: { implemented_functions: coreIpImplemented, catalog: C.CORE_IP_FUNCTIONS },
  assumption_package: assumptionPkg,
  environment_integrity: env, execution_integrity: exe, boundary_monitoring: boundary,
  containment_decision: containment, evidence_confidence: confidence, ai_assurance: ai,
  blocked: { real_provider: 'BLOCKED', private_repo: 'BLOCKED', gate_8: 'BLOCKED', deploy: 'BLOCKED', bill: 'BLOCKED', contact: 'BLOCKED', merge: 'BLOCKED' },
};
const DOCS = join(REPO, 'docs/generated/p0_core_ip_assumption_env_verification');
mkdirSync(DOCS, { recursive: true });
writeFileSync(join(DOCS, 'CORE_IP_EVIDENCE.json'), JSON.stringify(evidence, null, 2));

// UI data
const ui = {
  kind: 'CORE_IP', run_id: RUN_ID,
  core_ip: { implemented: coreIpImplemented, total: coreIpImplemented, status: 'INTEGRATED_LOCAL' },
  assumptions: { declared: assumptionPkg.declared, verified: assumptionPkg.verified, unknown: assumptionPkg.unknown, stale: assumptionPkg.stale, violated: assumptionPkg.violations, action: assumptionPkg.package_action, summary: assumptionPkg.summary },
  environment_integrity: { status: env.status, seal: env.environment_seal.status, violations: env.violations, unknown: env.unknown, checks: env.checks.map((c) => ({ name: c.name, classification: c.classification })) },
  execution_integrity: { status: exe.status, violations: exe.violations, unknown: exe.unknown, fails_closed: exe.fails_closed, limit: exe.limit },
  boundary_monitoring: { status: boundary.status, overall_action: boundary.overall_action, drifts: boundary.drifts, unknown: boundary.unknown },
  containment: { decision: containment.decision, status: containment.status, proceed: containment.proceed },
  evidence_confidence: { level: confidence.level, uses_ai_confidence: confidence.uses_ai_confidence, score: confidence.score },
  ai_config_manifest: { fingerprint: ai.ai_configuration_manifest.manifest_fingerprint, real_provider_enabled: false, model_version: ai.ai_configuration_manifest.model_version },
  blocked: evidence.blocked,
  labels: ['LOCAL_SYNTHETIC_ONLY', 'P0 Core IP (46 primitives)', 'evidence over self-report', 'a provider claim is never proof', 'evidence confidence NOT AI confidence', 'real provider BLOCKED', 'private repo BLOCKED', 'GATE 8 BLOCKED', 'NEVER SHIP'],
};
const ASSETS = join(REPO, 'demo/founder_operating_environment/assets/core_ip');
mkdirSync(ASSETS, { recursive: true });
writeFileSync(join(ASSETS, 'core_ip_index.json'), JSON.stringify(ui, null, 2));

console.log(`EMIT_OK core_ip=${coreIpImplemented} assumptions=${assumptionPkg.verified}/${assumptionPkg.declared} env=${env.status} exe=${exe.status} boundary=${boundary.overall_action} containment=${containment.decision} confidence=${confidence.level}`);
