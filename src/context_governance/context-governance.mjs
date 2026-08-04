// LANE W5a — Context Governance (LOCAL / DETERMINISTIC). Budgets fail closed when exceeded.
export function budget(kind,cap,used){const ok=(used||0)<=(cap||0);return {record_type:'budget',kind,cap:cap||0,used:used||0,status:ok?'WITHIN_BUDGET':'EXCEEDED_FAIL_CLOSED',proceed:ok};}
export const BUDGET_KINDS=Object.freeze(['context_size','token','latency','cost','retry','loop','autonomous_execution']);
export function constraintLibrary(i={}){return {record_type:'constraint_library',constraints:(i.constraints||['no_network','no_secrets','local_only']).slice(),status:'OK'};}
export function evidenceProfile(i={}){return {record_type:'evidence_profile_library',profiles:(i.profiles||[]).length,status:'OK'};}
export function contextEngineering(i={}){const budgets=(i.budgets||BUDGET_KINDS).length;return {record_type:'context_engineering_governance',budgets_declared:budgets,status:budgets>=BUDGET_KINDS.length?'OK':'HOLD_MISSING_BUDGETS'};}
export function checkBudgets(i={}){const results=BUDGET_KINDS.map(k=>budget(k,(i[k]&&i[k].cap)||1,(i[k]&&i[k].used)||0));const exceeded=results.filter(r=>!r.proceed);return {record_type:'budget_check',results,exceeded:exceeded.length,status:exceeded.length?'EXCEEDED_FAIL_CLOSED':'OK'};}
