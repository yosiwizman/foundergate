import { buildEvidencePackage, REQUIRED_SECTIONS, hasAllSections } from '../../src/physical_containment/physical-evidence-package.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 15 package contains all 20 sections
ok(REQUIRED_SECTIONS.length===20,'15a schema has 20 required sections');
const full={}; for(const s of REQUIRED_SECTIONS) full[s]='x';
const pkg=buildEvidencePackage(full);
ok(hasAllSections(pkg)&&pkg.status==='SEALED_WITH_LIMITS','15b full package → SEALED_WITH_LIMITS');
const partial=buildEvidencePackage({run_contract_and_digest:'x'});
ok(partial.status==='EVIDENCE_INCOMPLETE'&&partial.missing_sections.length>0,'partial package → EVIDENCE_INCOMPLETE');
// non-claims always present
ok(pkg.sections.explicit_non_claims_and_limitations.some(x=>/NOT real physical containment/.test(x)),'explicit non-claims always present');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
