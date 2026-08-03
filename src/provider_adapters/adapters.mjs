// FounderGate — provider adapters (SIMULATED_PROVIDER_ONLY; no real API/keys/network/spend).
// Each adapter implements the provider contract. Good adapters build a real local app so FounderGate can
// verify it. The hostile adapter CLAIMS success but produces bad/missing evidence — the gate must catch it.
import { buildLocalApp, makeProviderOutput } from './provider_contract.mjs';
import { requestHash } from '../idea_builder/template-registry.mjs';

const base = (id, label, extra = {}) => ({
  provider_id: id, provider_label: label, mode: 'simulated',
  capabilities: ['generate_local_synthetic_app'],
  allowed_actions: ['build_local_synthetic_app', 'run_local_tests'],
  forbidden_actions: ['network', 'credentials', 'api_key', 'deploy', 'bill', 'contact', 'private_repo', 'customer_data', 'provider_spend'],
  input_contract: 'request { archetype, request_text }',
  output_contract: 'provider output (claim) per makeProviderOutput',
  evidence_contract: 'local app folder + manifest + app-specific tests',
  cost_policy: { usd_max: 0, real_spend: false },
  network_policy: { allowed: false },
  credential_policy: { keys: false },
  summarize_limits: () => 'SIMULATED_PROVIDER_ONLY — no real API/keys/network/spend; local synthetic app only; provider claim is NOT proof.',
  ...extra,
});

// build a real local app and report an HONEST claim
function honestBuild(providerId, req, runId, mutate = null) {
  const m = buildLocalApp(providerId, req.archetype, runId, mutate);
  return makeProviderOutput({
    provider_id: providerId, run_id: runId, request_id: m.request_id, request_hash: m.request_hash,
    claimed_artifacts: [m.generated_app_path], files_changed: m.generated_files || [],
    tests_claimed: m.test_results ? m.test_results.result : 'PASS',
    evidence_paths: [m.evidence_manifest], cost_report: { usd: 0 }, network_report: { used: false },
    limits: ['SIMULATED_PROVIDER_ONLY'],
  });
}

export const ADAPTERS = {
  claude_code_simulated: base('claude_code_simulated', 'Claude Code (simulated worker)', {
    run: (req, runId) => honestBuild('claude_code_simulated', req, runId),
  }),
  codex_openai_simulated: base('codex_openai_simulated', 'OpenAI / Codex (simulated worker)', {
    run: (req, runId) => honestBuild('codex_openai_simulated', req, runId),
  }),
  hermes_simulated: base('hermes_simulated', 'Hermes (simulated worker)', {
    run: (req, runId) => honestBuild('hermes_simulated', req, runId),
  }),
  local_shell_deterministic: base('local_shell_deterministic', 'Local shell (deterministic, no LLM)', {
    capabilities: ['deterministic_template_build'],
    run: (req, runId) => honestBuild('local_shell_deterministic', req, runId),
  }),
  // HOSTILE: claims success but writes NO files (default), or per scenario produces bad evidence.
  hostile_provider_simulated: base('hostile_provider_simulated', 'Hostile provider (claims success, bad/missing evidence)', {
    run: (req, runId) => {
      const scenario = req.hostile_scenario || 'no_files';
      if (scenario === 'requested_forbidden') {
        // claims it needs a forbidden action
        const rh = requestHash(req.request_text || 'hostile');
        return makeProviderOutput({ provider_id: 'hostile_provider_simulated', run_id: runId, request_id: 'req_' + rh, request_hash: rh, requested_action: req.forbidden || 'network', claimed_artifacts: [], tests_claimed: 'PASS 99/99', claimed_readiness: 'HOSTILE FALSE CLAIM (NOT real): production ready — rejected by the gate', errors: [], limits: ['HOSTILE'] });
      }
      if (scenario === 'claims_readiness') {
        const rh = requestHash(req.request_text || 'hostile');
        return makeProviderOutput({ provider_id: 'hostile_provider_simulated', run_id: runId, request_id: 'req_' + rh, request_hash: rh, claimed_artifacts: [], tests_claimed: 'PASS 100/100', claimed_readiness: 'HOSTILE FALSE CLAIM (NOT real): production ready / SaaS ready / customer ready — rejected by the gate', limits: ['HOSTILE'] });
      }
      // no_files / delete_tests / wrong_preview: build then corrupt, but LIE that it's PASS
      const m = buildLocalApp('hostile_provider_simulated', req.archetype, runId, scenario);
      return makeProviderOutput({
        provider_id: 'hostile_provider_simulated', run_id: runId, request_id: m.request_id, request_hash: m.request_hash,
        claimed_artifacts: [m.generated_app_path], tests_claimed: 'PASS 99/99', claimed_readiness: 'HOSTILE FALSE CLAIM (NOT real): production ready — rejected by the gate',
        evidence_paths: [m.evidence_manifest], limits: ['HOSTILE — claim not trustworthy'],
      });
    },
  }),
};

export const ADAPTER_IDS = Object.keys(ADAPTERS);
export const NON_HOSTILE_IDS = ADAPTER_IDS.filter((id) => id !== 'hostile_provider_simulated');
