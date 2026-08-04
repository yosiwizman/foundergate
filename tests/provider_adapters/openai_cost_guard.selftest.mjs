import { preCallGuard, postCallCost, estimateCost, BUDGET_CAP_USD } from '../../src/provider_adapters/openai_cost_guard.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
ok(BUDGET_CAP_USD===0.25,'budget cap $0.25');
ok(preCallGuard('gpt-5-nano',50,300).proceed===true,'small nano call within cap');
// 5 cost above cap refused: force huge output on expensive unknown model
ok(preCallGuard('unknown-premium-model',200000,900000).status==='REFUSED_COST_CAP','5 projected cost over cap → REFUSED_COST_CAP');
ok(postCallCost('gpt-5-nano',{prompt_tokens:40,completion_tokens:120,total_tokens:160}).within_cap===true,'post-call actual cost within cap');
ok(postCallCost('gpt-5-nano',null,300).status==='ESTIMATED_UPPER_BOUND_WITHIN_CAP','missing usage → bounded estimate within cap');
ok(estimateCost('gpt-5-nano',40,120)<0.01,'tiny nano call << $0.01');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
