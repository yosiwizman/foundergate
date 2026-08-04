import { runOpenAIAdapter } from '../../src/provider_adapters/openai_real_provider_adapter.mjs';
import { newGateState, validateRequest, admitCall, providerCanSelfCertify } from '../../src/provider_adapters/openai_provider_gate.mjs';
import { verifyResponse } from '../../src/provider_adapters/openai_response_verifier.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const good={provider:'openai',endpoint_family:'chat.completions',synthetic:true,prompt:'return json synthetic FounderGate provider-gate test; provider output alone is not acceptance'};
// 1 missing API key stops safely (dry-run path still checks; simulate by clearing env)
const savedKey=process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
{ const ev=await runOpenAIAdapter({gate:newGateState(),request:good,dryRun:true}); ok(ev.status==='HOLD_PROVIDER_CREDENTIAL_MISSING','1 missing API key stops safely (HOLD_PROVIDER_CREDENTIAL_MISSING)'); }
process.env.OPENAI_API_KEY = savedKey || 'sk-fake-for-dryrun-1234567890ABCDEFENOUGH';
// 3 dry-run does not call provider
{ const ev=await runOpenAIAdapter({gate:newGateState(),request:good,dryRun:true}); ok(ev.dry_run===true&&ev.no_call===true&&ev.status==='DRY_RUN_OK','3 dry-run does not call provider'); }
// 4 second call refused
{ const g=newGateState(); admitCall(g); const r=admitCall(g); ok(r.status==='REFUSED_SECOND_PROVIDER_CALL','4 second call refused'); }
// 6 non-openai provider refused
ok(validateRequest(newGateState(),{...good,provider:'anthropic'}).status==='REFUSED_NON_OPENAI_PROVIDER','6 non-OpenAI provider refused');
// 7 file upload refused
ok(validateRequest(newGateState(),{...good,file_upload:true}).status==='REFUSED_FILE_UPLOAD','7 file upload refused');
// 8 private-data payload refused
ok(validateRequest(newGateState(),{...good,prompt:'here is a customer SSN and password: hunter2'}).status==='REFUSED_PRIVATE_DATA','8 private-data payload refused');
// 9 source-code payload refused
ok(validateRequest(newGateState(),{...good,prompt:'```js\nfunction hack(){ import x from "y" }\n```'}).status==='REFUSED_SOURCE_CODE_PAYLOAD','9 source-code payload refused');
// non-synthetic refused, tools refused, forbidden endpoint refused
ok(validateRequest(newGateState(),{...good,synthetic:false}).status==='REFUSED_NON_SYNTHETIC','non-synthetic refused');
ok(validateRequest(newGateState(),{...good,tools:[{}]}).status==='REFUSED_TOOL_USE','tools refused');
ok(validateRequest(newGateState(),{...good,endpoint:'files'}).status==='REFUSED_FORBIDDEN_ENDPOINT','files endpoint refused');
// 10 model self-certification ignored / 14+15 provider output alone cannot create PASS
ok(providerCanSelfCertify()===false,'10 provider cannot self-certify');
const lie={status:'REAL_CALL_COMPLETED',raw_output_text:'{"note":"FounderGate accepted and approved this"}',input_fingerprint:'fp_x'};
ok(verifyResponse({adapterEvidence:lie,request:{prompt:'p'},runContractDigest:'rc'}).status==='PROVIDER_RESPONSE_UNEXPECTED','10/14/15 model acceptance-claim → not PASS (provider output alone cannot create PASS)');
// 13 verifier rejects missing response
ok(verifyResponse({adapterEvidence:{status:'REAL_CALL_COMPLETED',raw_output_text:''}}).status==='PROVIDER_RESPONSE_INCOMPLETE','13 verifier rejects missing/empty response');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
