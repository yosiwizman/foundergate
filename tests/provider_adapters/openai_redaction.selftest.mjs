import { redact, secretScan } from '../../src/provider_adapters/openai_redaction.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 11 removes Authorization headers, 12 removes bearer tokens
ok(!/sk-[A-Za-z0-9]{20}/.test(redact('key sk-abcdefghij1234567890XYZ here')),'redacts openai key');
ok(redact('Authorization: Bearer sk-abcdefghij1234567890XYZ').includes('[REDACTED')&&!/sk-[A-Za-z0-9]{20}/.test(redact('Authorization: Bearer sk-abcdefghij1234567890XYZ')),'11/12 redacts Authorization header + bearer token');
ok(redact('reach me at a@b.com or 415-555-1212').includes('[REDACTED_EMAIL]'),'redacts email');
ok(secretScan('Authorization: Bearer sk-abcdefghij1234567890XYZ').clean===false,'secret scan catches bearer/key');
ok(secretScan('clean synthetic text with no secrets').clean===true,'secret scan clean on safe text');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
