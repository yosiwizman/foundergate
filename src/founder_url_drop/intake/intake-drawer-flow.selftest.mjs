import { buildIntakeDrawerFlow, renderIntakeDrawerFlowText } from "./intake-drawer-flow.mjs";
let n=0; const fails=[]; const ok=(name,cond)=>{n++; if(!cond){fails.push(name); console.log("  FAIL "+name);} else console.log("  ok   "+name);};
console.log("== Lane B — intake -> evidence-drawer flow ==");
const pack={manifest_sha256:"b".repeat(64),entries:[{label:"exact_commit",value:"deadbeef",class:"PUBLIC"}]};
const result={url:"https://github.com/pypa/sampleproject",verdict:"COMPILEABILITY_OBSERVED"};
// 01 accepted URL -> drawer linked
(()=>{const f=buildIntakeDrawerFlow({url:"https://github.com/pypa/sampleproject",safetyResult:result,evidencePack:pack});ok("01 accepted -> EVIDENCE_LINKED",f.accepted&&f.flow_stage==="EVIDENCE_LINKED"&&f.drawer&&f.drawer.linked);})();
// 02 blocked URL -> evidence WITHHELD, drawer null (fail closed)
(()=>{const f=buildIntakeDrawerFlow({url:"http://github.com/a/b",safetyResult:result,evidencePack:pack});ok("02 blocked -> withheld/null",!f.accepted&&f.drawer===null&&f.evidence_withheld&&f.flow_stage==="BLOCKED_AT_INTAKE");})();
// 03 unsupported host -> withheld
(()=>{const f=buildIntakeDrawerFlow({url:"https://example.com/a/b",safetyResult:result,evidencePack:pack});ok("03 unsupported -> withheld",!f.accepted&&f.drawer===null);})();
// 04 accepted but no pack -> AWAITING_EVIDENCE (accepted, drawer not linked)
(()=>{const f=buildIntakeDrawerFlow({url:"https://github.com/a/b"});ok("04 accepted no pack -> AWAITING_EVIDENCE",f.accepted&&f.flow_stage==="AWAITING_EVIDENCE");})();
// 05 NEVER fetches
ok("05 fetch_performed false",buildIntakeDrawerFlow({url:"https://github.com/a/b"}).fetch_performed===false);
// 06 empty/garbage url -> blocked withheld (fail closed)
(()=>{const f=buildIntakeDrawerFlow({});ok("06 empty -> BLOCKED_AT_INTAKE withheld",!f.accepted&&f.evidence_withheld);})();
// 07 frozen output
ok("07 frozen",Object.isFrozen(buildIntakeDrawerFlow({url:"https://github.com/a/b"})));
// 08 deterministic render
(()=>{const a={url:"https://github.com/pypa/sampleproject",safetyResult:result,evidencePack:pack};ok("08 deterministic render",renderIntakeDrawerFlowText(buildIntakeDrawerFlow(a))===renderIntakeDrawerFlowText(buildIntakeDrawerFlow(a)));})();
// 09 blocked render says WITHHELD, not evidence
(()=>{const t=renderIntakeDrawerFlowText(buildIntakeDrawerFlow({url:"http://x/a/b"}));ok("09 blocked render WITHHELD",t.includes("WITHHELD")&&!t.includes("verdict="));})();
console.log(fails.length?`\nRED: ${fails.length}/${n} failed`:`\nINTAKE-DRAWER-FLOW-SELFTEST: PASS (${n} checks)`);
process.exit(fails.length?1:0);
