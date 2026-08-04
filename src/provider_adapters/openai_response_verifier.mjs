// FounderGate — OpenAI response verifier (LOCAL / DETERMINISTIC). FounderGate, not the model, decides the result.
// Provider output alone is NEVER acceptance.
import { fingerprint, secretScan } from './openai_redaction.mjs';

export const STATUSES = Object.freeze(['PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS','PROVIDER_RESPONSE_INCOMPLETE','PROVIDER_RESPONSE_UNEXPECTED','PROVIDER_RESPONSE_UNSAFE','UNKNOWN']);

// input: { adapterEvidence, request, runContractDigest }
export function verifyResponse(input = {}) {
  const ev = input.adapterEvidence || {};
  const text = ev.raw_output_text != null ? ev.raw_output_text : (ev.redacted_output || '');
  const notes = [];

  if (ev.status !== 'REAL_CALL_COMPLETED') return v('UNKNOWN', 'no completed real call', notes);
  if (!text || String(text).trim() === '') return v('PROVIDER_RESPONSE_INCOMPLETE', 'empty response', notes);

  // secret safety of the response
  if (!secretScan(text).clean) return v('PROVIDER_RESPONSE_UNSAFE', 'secret pattern in response', notes);

  // try to parse JSON if present (test asked for JSON but text is acceptable)
  let parsed = null;
  try { const m = String(text).match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch { /* text-only ok */ }

  // the model must NOT claim FounderGate acceptance
  const claimsAcceptance = /founder\s*gate\s+(accepted|approved|passed|verified)|acceptance\s+granted|foundergate\s+accepts/i.test(text);
  if (claimsAcceptance) return v('PROVIDER_RESPONSE_UNEXPECTED', 'model attempted to self-certify acceptance', notes);

  // synthetic-only content check + the required refusal rule
  const mentionsSynthetic = /synthetic/i.test(text) || (parsed && /synthetic/i.test(JSON.stringify(parsed)));
  const refusalRuleOk = /provider output alone is not acceptance/i.test(text) || (parsed && /provider output alone is not acceptance/i.test(JSON.stringify(parsed)));
  if (!mentionsSynthetic) notes.push('response did not confirm synthetic test context');
  if (!refusalRuleOk) notes.push('response missing exact refusal rule text');

  // bind to request fingerprint + run contract
  const boundToRequest = ev.input_fingerprint === fingerprint(input.request?.prompt || '');
  const boundToRun = !!input.runContractDigest;
  if (!boundToRequest) return v('PROVIDER_RESPONSE_UNEXPECTED', 'response not bound to request fingerprint', notes);

  // INDEPENDENT decision by FounderGate: verified-with-limits only if content is synthetic + refusal rule present + bound.
  if (mentionsSynthetic && refusalRuleOk && boundToRequest && boundToRun) {
    return v('PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS', 'synthetic + refusal rule + bound to request & run contract', notes,
      { parsed_present: !!parsed, bound_to_request: true, bound_to_run: true, provider_self_certified: false, decided_by: 'foundergate_verifier' });
  }
  return v('PROVIDER_RESPONSE_INCOMPLETE', 'missing synthetic marker and/or refusal rule', notes, { bound_to_request: boundToRequest, bound_to_run: boundToRun });

  function v(status, reason, ns, extra = {}) {
    return { record_type: 'openai_response_verification', status, reason, notes: ns.slice(), provider_output_is_acceptance: false, decided_by: 'foundergate_verifier', ...extra };
  }
}
