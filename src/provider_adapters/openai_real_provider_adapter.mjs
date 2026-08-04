// FounderGate — OpenAI REAL provider adapter (subordinate to the gate). One call only, budget-capped, synthetic input.
// The key is read from process.env.OPENAI_API_KEY only; it is NEVER printed, logged, stored, or placed in evidence.
import { redact, secretScan, fingerprint, sha256 } from './openai_redaction.mjs';
import { validateRequest, admitCall, ALLOWED_PROVIDER, ALLOWED_ENDPOINT_FAMILY } from './openai_provider_gate.mjs';
import { preCallGuard, postCallCost, BUDGET_CAP_USD } from './openai_cost_guard.mjs';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// rough token estimate (chars/4) — used only for the pre-call cost bound.
const estTokens = (s) => Math.ceil(String(s).length / 4);

// runReal({ gate, request, model, maxOutputTokens, dryRun, stamp })
// request must be the pre-approved synthetic object: { provider:'openai', endpoint_family:'chat.completions', synthetic:true, prompt }
export async function runOpenAIAdapter(opts = {}) {
  const { gate, request, model = 'gpt-5-nano', maxOutputTokens = 300, dryRun = false, stamp = null } = opts;
  const started = stamp?.start ?? 0;

  // 1. gate validates the request (before touching network/credential)
  const gv = validateRequest(gate, request);
  if (!gv.ok) return evidence({ status: gv.status, reason: gv.reason, model, no_call: true });

  // 2. credential presence (never read value into evidence)
  const key = process.env.OPENAI_API_KEY;
  const credential_present = typeof key === 'string' && key.length > 20;
  if (!credential_present) return evidence({ status: 'HOLD_PROVIDER_CREDENTIAL_MISSING', model, no_call: true, credential_present: false });

  // 3. cost guard pre-call (worst case must fit the cap)
  const promptTokensEst = estTokens(request.prompt);
  const pre = preCallGuard(model, promptTokensEst, maxOutputTokens);
  if (!pre.proceed) return evidence({ status: 'REFUSED_COST_CAP', model, no_call: true, cost_precall: pre });

  // 4. admit exactly one call
  const adm = admitCall(gate);
  if (!adm.ok) return evidence({ status: adm.status, model, no_call: true });

  // dry-run: prove the whole path WITHOUT a network call
  if (dryRun) {
    return evidence({ status: 'DRY_RUN_OK', model, no_call: true, dry_run: true, cost_precall: pre,
      input_fingerprint: fingerprint(request.prompt), redacted_input: redact(request.prompt) });
  }

  // 5. THE ONE REAL CALL — no retry, no streaming loop
  const body = { model, messages: [{ role: 'user', content: request.prompt }], max_completion_tokens: maxOutputTokens };
  const t0 = (stamp?.now?.() ?? Date.now?.() ?? 0);
  let resp, json, httpStatus, errMsg = null;
  try {
    resp = await fetch(ENDPOINT, { method: 'POST', headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    httpStatus = resp.status;
    json = await resp.json();
  } catch (e) { errMsg = String(e && e.message || e); }
  const elapsed_ms = ((stamp?.now?.() ?? Date.now?.() ?? 0) - t0);

  if (errMsg || !json || json.error) {
    const reason = errMsg || (json && json.error && json.error.message) || 'unknown provider error';
    return evidence({ status: 'PROVIDER_ERROR', model, http_status: httpStatus, error: redact(reason), call_count: gate.call_count, no_retry: true,
      input_fingerprint: fingerprint(request.prompt), redacted_input: redact(request.prompt), elapsed_ms });
  }

  const outText = json.choices?.[0]?.message?.content ?? '';
  const usage = json.usage || null;
  const cost = postCallCost(model, usage, maxOutputTokens);
  const ev = evidence({
    status: 'REAL_CALL_COMPLETED', model,
    endpoint_family: ALLOWED_ENDPOINT_FAMILY, http_status: httpStatus,
    response_id: json.id || null, system_fingerprint: json.system_fingerprint || null,
    input_fingerprint: fingerprint(request.prompt), redacted_input: redact(request.prompt),
    output_fingerprint: fingerprint(outText), redacted_output: redact(outText),
    raw_output_text: outText, // kept in-memory for the verifier; redacted before persistence
    token_usage: usage, cost, elapsed_ms, call_count: gate.call_count, no_retry: true, no_second_call: gate.call_count === 1,
  });
  return ev;

  function evidence(x) {
    const base = {
      record_type: 'openai_adapter_evidence', provider: ALLOWED_PROVIDER, model: x.model || model,
      budget_cap_usd: BUDGET_CAP_USD, credential_present: x.credential_present ?? credentialPresentSafe(),
      credential_source: 'environment', no_private_data: true, no_customer_data: true, no_repo_data: true,
      no_secret_leak: true, ...x,
    };
    // structural secret guard on the persisted view (excludes raw_output_text which the caller redacts before writing)
    const persistView = { ...base }; delete persistView.raw_output_text;
    base.no_secret_leak = secretScan(JSON.stringify(persistView)).clean;
    return base;
  }
  function credentialPresentSafe() { return typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.length > 20; }
}
