import * as C from '../../src/context_governance/context-governance.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
ok(C.budget('token',10,20).status==='EXCEEDED_FAIL_CLOSED','budget exceeded cannot pass');
ok(C.budget('token',10,5).proceed===true,'within budget proceeds');
ok(C.contextEngineering({budgets:['token']}).status==='HOLD_MISSING_BUDGETS','missing budgets held');
ok(C.checkBudgets({token:{cap:1,used:5}}).status==='EXCEEDED_FAIL_CLOSED','check budgets fail closed on exceed');
ok(C.BUDGET_KINDS.length===7,'7 budget kinds');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
