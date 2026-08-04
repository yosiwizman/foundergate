import { LEVELS, classifyLevel, levelSpec } from '../../src/physical_containment/assurance-levels.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 1 levels distinct
ok(LEVELS[1].name!==LEVELS[2].name&&LEVELS[2].name!==LEVELS[3].name&&LEVELS[1].id===1&&LEVELS[3].id===3,'1 Level 1/2/3 are distinct');
// 2 Level1 cannot claim hardware-assisted
ok(classifyLevel({claimed_level:2,hardware_root_of_trust:false}).status==='HOLD_LEVEL_NOT_SUPPORTED','2 Level1 cannot claim hardware-assisted (no HW root)');
// 3 Level2 cannot claim physically severed
ok(classifyLevel({claimed_level:3,hardware_root_of_trust:true,all_paths_governed:false}).status==='HOLD_LEVEL_NOT_SUPPORTED','3 Level2 cannot claim physically severed');
// legit level 3
ok(classifyLevel({claimed_level:3,hardware_root_of_trust:true,all_paths_governed:true,one_way_evidence_channel:true}).status==='OK','legit Level3 (all conditions) OK');
// 19 one path test doesnt imply all
ok(classifyLevel({claimed_level:3,inferred_all_paths_from_one_test:true}).problems.some(p=>/one successful path test/.test(p)),'19 one path test does not imply all blocked');
// forbidden claims block
ok(LEVELS[3].forbidden_claims.includes('escape impossible')&&LEVELS[2].forbidden_claims.includes('physically severed execution'),'forbidden claims listed per level');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
