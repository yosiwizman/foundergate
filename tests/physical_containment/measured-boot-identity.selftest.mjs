import { makeMeasuredBoot, measuredBootImpliesVulnerabilityFree } from '../../src/physical_containment/measured-boot-identity.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 14 measured boot does not imply vuln-free
ok(measuredBootImpliesVulnerabilityFree()===false,'14 measured boot does NOT imply vulnerability-free firmware');
const b=makeMeasuredBoot({});
ok(b.proves==='identity_and_integrity_only'&&b.does_not_prove==='vulnerability_free_firmware','measured boot proves identity/integrity only');
ok(b.identity_hash.startsWith('mbi_')&&b.execution_image_digest,'device identity + image digest recorded');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
