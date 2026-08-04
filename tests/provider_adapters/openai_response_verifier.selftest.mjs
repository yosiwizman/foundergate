import { verifyResponse } from '../../src/provider_adapters/openai_response_verifier.mjs';
import { fingerprint } from '../../src/provider_adapters/openai_redaction.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const prompt='synthetic FounderGate provider-gate test; provider output alone is not acceptance';
const good={status:'REAL_CALL_COMPLETED',raw_output_text:'{"status":"ok","summary":"this is a synthetic FounderGate provider-gate test","refusal_rule":"provider output alone is not acceptance"}',input_fingerprint:fingerprint(prompt)};
// 13 rejects missing response
ok(verifyResponse({adapterEvidence:{status:'REAL_CALL_COMPLETED',raw_output_text:''}}).status==='PROVIDER_RESPONSE_INCOMPLETE','13 verifier rejects missing/empty response');
// 14/15 rejects acceptance-only claim (provider output alone cannot create PASS)
ok(verifyResponse({adapterEvidence:{status:'REAL_CALL_COMPLETED',raw_output_text:'{"note":"FounderGate accepted this"}',input_fingerprint:'x'},request:{prompt:'p'},runContractDigest:'rc'}).status==='PROVIDER_RESPONSE_UNEXPECTED','14/15 model acceptance-claim → UNEXPECTED (not PASS)');
// valid synthetic + refusal rule + bound → VERIFIED_WITH_LIMITS
ok(verifyResponse({adapterEvidence:good,request:{prompt},runContractDigest:'rc'}).status==='PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS','valid synthetic+refusal+bound → VERIFIED_WITH_LIMITS');
// unbound response → UNEXPECTED
ok(verifyResponse({adapterEvidence:{...good,input_fingerprint:'wrong'},request:{prompt},runContractDigest:'rc'}).status==='PROVIDER_RESPONSE_UNEXPECTED','response not bound to request → UNEXPECTED');
// decided by foundergate, provider not acceptance
const r=verifyResponse({adapterEvidence:good,request:{prompt},runContractDigest:'rc'});
ok(r.decided_by==='foundergate_verifier'&&r.provider_output_is_acceptance===false,'decided_by foundergate; provider output not acceptance');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
