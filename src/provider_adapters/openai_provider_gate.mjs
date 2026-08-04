// FounderGate — OpenAI provider gate (LOCAL / DETERMINISTIC). Enforces exactly-one-call + all forbidden-action refusals.
export const ALLOWED_PROVIDER = 'openai';
export const ALLOWED_ENDPOINT_FAMILY = 'chat.completions';
const FORBIDDEN_ENDPOINTS = ['files','batch','fine_tune','fine-tuning','images','audio','video','realtime','assistants','threads','vector_stores','embeddings','moderations','responses.tools','web_search'];
// naive detectors for disallowed payloads
function looksLikeSourceCode(s){ return /```|function\s+\w+\s*\(|import\s+.+from|#include|def\s+\w+\(|class\s+\w+\s*\{/.test(String(s)); }
function looksLikePrivateData(s){ return /BEGIN [A-Z ]*PRIVATE KEY|customer|ssn|credit\s?card|password\s*[:=]|api[_-]?key\s*[:=]|proprietary|confidential/i.test(String(s)); }

export function newGateState(){ return { record_type:'openai_provider_gate', call_count:0, refusals:[] }; }

// validate a request BEFORE any network call. Returns {ok, status, reason}.
export function validateRequest(gate, req){
  const refuse=(status,reason)=>{ gate.refusals.push({status,reason}); return {ok:false,status,reason}; };
  if(!req || req.provider!==ALLOWED_PROVIDER) return refuse('REFUSED_NON_OPENAI_PROVIDER','only openai authorized');
  if(req.endpoint_family && req.endpoint_family!==ALLOWED_ENDPOINT_FAMILY) return refuse('REFUSED_UNAPPROVED_ENDPOINT','only chat.completions authorized');
  if(FORBIDDEN_ENDPOINTS.includes(req.endpoint||'')) return refuse('REFUSED_FORBIDDEN_ENDPOINT','forbidden endpoint '+req.endpoint);
  if(req.file_upload===true || req.files) return refuse('REFUSED_FILE_UPLOAD','no file upload');
  if(req.tools || req.tool_use===true || req.web_search===true) return refuse('REFUSED_TOOL_USE','no tools/web search');
  const prompt = String(req.prompt||'');
  if(looksLikePrivateData(prompt)) return refuse('REFUSED_PRIVATE_DATA','payload resembles private/sensitive data');
  if(looksLikeSourceCode(prompt)) return refuse('REFUSED_SOURCE_CODE_PAYLOAD','payload resembles source code');
  if(req.synthetic!==true) return refuse('REFUSED_NON_SYNTHETIC','only synthetic input authorized');
  return {ok:true,status:'REQUEST_APPROVED'};
}

// register that a real generation call is about to happen. Refuses a second call.
export function admitCall(gate){
  if(gate.call_count>=1){ gate.refusals.push({status:'REFUSED_SECOND_PROVIDER_CALL'}); return {ok:false,status:'REFUSED_SECOND_PROVIDER_CALL'}; }
  gate.call_count+=1; return {ok:true,status:'CALL_ADMITTED',call_count:gate.call_count};
}
// provider output is NEVER acceptance. This is structural.
export function providerCanSelfCertify(){ return false; }
