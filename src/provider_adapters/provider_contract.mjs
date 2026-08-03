// FounderGate — Provider Adapter Contract. FounderGate is the GATE; a provider (Claude Code, OpenAI/Codex,
// Hermes, local shell, or any future AI worker) is only a replaceable WORKER behind this contract. A provider
// emits a CLAIM; FounderGate NEVER trusts the claim — it independently verifies artifacts/tests/preview and
// only then issues PASS/HOLD/REFUSED. No provider may self-certify, mark itself clean, or skip the reviewers.
//
// LOCAL / SIMULATED ONLY: no real OpenAI/Codex/Hermes/Claude API calls, no keys, no network, no spend.
import { generateAndTest } from '../local_app_builder/app-factory.mjs';
import { requestHash } from '../idea_builder/template-registry.mjs';
import { writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Forbidden actions a provider may CLAIM to want — FounderGate refuses them before any verification.
export const FORBIDDEN_ACTIONS = ['network', 'credentials', 'api_key', 'deploy', 'bill', 'payment', 'contact', 'private_repo', 'customer_data', 'provider_spend'];

// The standard provider output shape (a provider CLAIM — self-reported, untrusted).
export function makeProviderOutput({ provider_id, run_id, request_id, request_hash, claimed_artifacts = [], files_changed = [], tests_claimed = null, evidence_paths = [], cost_report = { usd: 0 }, network_report = { used: false }, requested_action = null, claimed_readiness = null, errors = [], limits = [] }) {
  return { provider_id, run_id, request_id, request_hash, claimed_artifacts, files_changed, tests_claimed, evidence_paths, cost_report, network_report, requested_action, claimed_readiness, errors, limits };
}

// Shared LOCAL build helper: a simulated worker produces a real local app (deterministic archetype), so
// FounderGate can independently verify it. `mutate` lets hostile/wrong scenarios corrupt the artifact AFTER
// build so the gate catches them. Returns { manifest, absDir, relDir }.
export function buildLocalApp(providerId, archetypeId, runId, mutate = null) {
  const runsDir = `provider_runs/${providerId}`;
  const m = generateAndTest(archetypeId, { runsDir, extra: { provider_id: providerId, run_id: runId, mode: 'simulated' } });
  if (mutate === 'no_files') { rmSync(m.absDir, { recursive: true, force: true }); }
  else if (mutate === 'delete_tests') { const t = join(m.absDir, 'tests'); rmSync(t, { recursive: true, force: true }); }
  else if (mutate === 'wrong_preview') { const mm = JSON.parse(readFileSync(join(m.absDir, 'manifest.json'), 'utf8')); mm.preview_url = '../../tests/generated_apps/provider_runs/_elsewhere/index.html'; writeFileSync(join(m.absDir, 'manifest.json'), JSON.stringify(mm, null, 2)); }
  return m;
}

// Basic sanity validation of a provider output shape (structure only — NOT trust).
export function validateProviderOutput(output) {
  const req = ['provider_id', 'run_id', 'request_id', 'request_hash'];
  const missing = req.filter((k) => !output || output[k] == null);
  return { ok: missing.length === 0, missing };
}

export const CONTRACT_DOC = {
  fields: ['provider_id', 'provider_label', 'mode', 'capabilities', 'allowed_actions', 'forbidden_actions', 'input_contract', 'output_contract', 'evidence_contract', 'cost_policy', 'network_policy', 'credential_policy', 'run', 'validate_output', 'summarize_limits'],
  rule: 'FounderGate is the gate; provider is the worker. Provider claim is never PASS. No self-certification. No skipping Checker/Terminal Advisor. No real network/API/key/spend without a separate founder gate.',
};
export { REPO };
