// FounderGate — OpenAI cost guard (LOCAL / DETERMINISTIC). Budget cap $0.25; fails closed on material uncertainty.
export const BUDGET_CAP_USD = 0.25;
// conservative per-1M-token prices (USD) for the cheap models; overestimate to fail safe.
const PRICES = {
  'gpt-5-nano':      { in: 0.05, out: 0.40 },
  'gpt-4.1-nano':    { in: 0.10, out: 0.40 },
  'gpt-4o-mini':     { in: 0.15, out: 0.60 },
  'gpt-5-mini':      { in: 0.25, out: 2.00 },
  '_default':        { in: 1.00, out: 4.00 }, // unknown model → expensive assumption (fail-safe)
};
function price(model){ const k=Object.keys(PRICES).find(p=>model&&model.startsWith(p)); return PRICES[k]||PRICES._default; }
export function estimateCost(model, inTokens, outTokens){
  const p = price(model);
  return +(((inTokens||0)/1e6)*p.in + ((outTokens||0)/1e6)*p.out).toFixed(8);
}
// pre-call: bound the maximum possible cost given a hard output cap. Refuse if it could exceed the budget.
export function preCallGuard(model, promptTokensEst, maxOutputTokens){
  const worst = estimateCost(model, promptTokensEst, maxOutputTokens);
  const ok = worst <= BUDGET_CAP_USD;
  return { record_type:'cost_guard_precall', model, prompt_tokens_est:promptTokensEst, max_output_tokens:maxOutputTokens,
    worst_case_cost_usd:worst, budget_cap_usd:BUDGET_CAP_USD, status: ok?'OK':'REFUSED_COST_CAP', proceed:ok };
}
// post-call: record actual cost from usage. If usage missing AND we cannot bound it, fail closed.
export function postCallCost(model, usage, maxOutputTokens){
  if(!usage || usage.prompt_tokens==null || usage.completion_tokens==null){
    // no usage → bound by max output; if even that exceeds cap, fail; else record as ESTIMATED_UPPER_BOUND
    const bound = estimateCost(model, 2000, maxOutputTokens||1000);
    return { record_type:'cost_guard_postcall', usage_present:false, estimated_upper_bound_usd:bound,
      status: bound<=BUDGET_CAP_USD?'ESTIMATED_UPPER_BOUND_WITHIN_CAP':'HOLD_COST_UNCERTAIN', within_cap: bound<=BUDGET_CAP_USD };
  }
  const actual = estimateCost(model, usage.prompt_tokens, usage.completion_tokens);
  return { record_type:'cost_guard_postcall', usage_present:true, prompt_tokens:usage.prompt_tokens, completion_tokens:usage.completion_tokens,
    total_tokens: usage.total_tokens ?? (usage.prompt_tokens+usage.completion_tokens),
    actual_cost_usd:actual, budget_cap_usd:BUDGET_CAP_USD, status: actual<=BUDGET_CAP_USD?'WITHIN_CAP':'EXCEEDED_COST_CAP', within_cap: actual<=BUDGET_CAP_USD };
}
export const NO_RETRY = true;
