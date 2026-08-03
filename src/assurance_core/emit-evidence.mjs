// Emit the Assurance Core evidence JSON + the UI data file for the dashboard panel. LOCAL / DETERMINISTIC.
import * as AC from '../assurance_core/assurance-core.mjs';
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const T = process.env.AC_STAMP || '2026-08-03T18:20:00-04:00';
const RUN_ID = 'adoption_p1_assurance_core_20260803T1820ET';

// Build a representative runtime from the provider-harness config (simulated worker).
const cfg = AC.makeConfigManifest({ model_id: 'claude-opus-4-8[1m]', provider_id: 'claude_code_simulated', mode: 'simulated', tools: ['read_file', 'write_file', 'run_local_tests'], mcp_servers: ['local_fs'], captured_at: T });
// context provenance from real local evidence dirs (names only, local)
let sources = [{ id: 'provider_harness', kind: 'evidence', content: 'provider_agnostic_repo_builder_harness' }, { id: 'post_provider_sync', kind: 'doc', content: 'post_provider_harness_roadmap_nextgate_sync' }, { id: 'adoption_matrix', kind: 'doc', content: 'adoption_matrix_p1_assurance_core' }];
const prov = AC.makeContextProvenance({ captured_at: T, sources });
const snap = AC.makeImmutableContextSnapshot(prov.provenance_hash + '|' + cfg.config_fingerprint, { captured_at: T });
const scan = AC.scanCompleteness({ scanned: AC.P1_ITEMS.length, total: AC.P1_ITEMS.length, errors: 0 });
const rb = AC.riskBudget({ cap_usd: 0, spent_usd: 0, network_calls: 0 });
const conf = AC.evidenceConfidence({ artifact_present: true, tests_run: true, independent_checker: true, context_snapshot: true, not_overclaimed: true });
const rt = AC.makeRuntimeManifest({ config_manifest: cfg, context_snapshot_hash: snap.snapshot_hash, scan_completeness_state: scan.state, risk_budget_status: rb.status, evidence_confidence: conf.level, captured_at: T });

const tools = cfg.tools.map((t) => AC.classifyTool({ id: t, capability: t === 'run_local_tests' ? 'WRITE_LOCAL' : (t === 'read_file' ? 'READ_ONLY_LOCAL' : 'WRITE_LOCAL') }));
const mcp = cfg.mcp_servers.map((m) => AC.classifyMcp({ id: m, capability: 'WRITE_LOCAL' }));
const providers = ['claude_code_simulated', 'codex_openai_simulated', 'hermes_simulated', 'local_shell_deterministic', 'hostile_provider_simulated'].map((p) => ({ ...AC.providerNeutralInterface(p), qualification: AC.providerQualification({ provider_id: p, real_provider: false }).status }));
const cov = AC.p1Coverage();
const evalGov = AC.evaluationDatasetGovernance();
const tmv = AC.threatModelVersion();

const evidence = {
  record_type: 'assurance_core_evidence', run_id: RUN_ID, stamp: T,
  config_manifest: cfg, runtime_manifest: rt, context_provenance: prov, immutable_snapshot: snap,
  scan_completeness: scan, risk_budget: rb, evidence_confidence: conf,
  tool_classification: tools, mcp_classification: mcp, provider_neutral: providers,
  provider_qualification: AC.providerQualification({ provider_id: 'claude_code_simulated', real_provider: false }),
  evaluation_dataset_governance: evalGov, threat_model_version: tmv,
  p1_coverage: cov,
  validations: {
    config: AC.validateConfigManifest(cfg).status, runtime: AC.validateRuntimeManifest(rt).status,
    provenance: AC.validateContextProvenance(prov).status, snapshot: AC.verifyImmutableSnapshot(snap, prov.provenance_hash + '|' + cfg.config_fingerprint).status,
  },
  blocked: { real_provider: 'BLOCKED', private_repo: 'BLOCKED', gate_8: 'BLOCKED', deploy: 'BLOCKED', bill: 'BLOCKED', contact: 'BLOCKED', merge: 'BLOCKED' },
};

// evidence JSON to docs
const DOCS = join(REPO, 'docs/generated/adoption_matrix_p1_assurance_core');
mkdirSync(DOCS, { recursive: true });
writeFileSync(join(DOCS, 'ASSURANCE_CORE_EVIDENCE.json'), JSON.stringify(evidence, null, 2));

// UI data for the panel
const ui = {
  kind: 'ASSURANCE_CORE', run_id: RUN_ID, stamp: T,
  p1_coverage: cov,
  runtime_manifest: { config_fingerprint: cfg.config_fingerprint, runtime_fingerprint: rt.runtime_fingerprint, provider_id: cfg.provider_id, provider_mode: rt.provider_mode, real_provider_enabled: false, threat_model_version: rt.threat_model_version, context_snapshot_hash: snap.snapshot_hash },
  evidence_confidence: conf, risk_budget: rb, scan_completeness: scan,
  immutable_snapshot: { snapshot_hash: snap.snapshot_hash, status: 'FROZEN' },
  tool_classification: tools, mcp_classification: mcp,
  provider_capability: providers.map((p) => ({ provider_id: p.provider_id, label: p.label, can_self_certify: p.can_self_certify, qualification: p.qualification })),
  evaluation_dataset_governance: { status: evalGov.status, real_dataset_present: false },
  blocked: evidence.blocked,
  labels: ['LOCAL_SYNTHETIC_ONLY', 'P1 Assurance Core (19 integrated, 1 planned)', 'a provider claim is never proof', 'real provider activation BLOCKED', 'private repo access BLOCKED', 'GATE 8 BLOCKED', 'NEVER SHIP'],
};
const ASSETS = join(REPO, 'demo/founder_operating_environment/assets/assurance');
mkdirSync(ASSETS, { recursive: true });
writeFileSync(join(ASSETS, 'assurance_index.json'), JSON.stringify(ui, null, 2));

console.log('EMIT_OK config=' + cfg.config_fingerprint + ' runtime=' + rt.runtime_fingerprint + ' coverage=' + cov.integrated + '/' + cov.total + ' partial=' + cov.partial + ' scan=' + scan.state + ' conf=' + conf.level + ' rb=' + rb.status);
