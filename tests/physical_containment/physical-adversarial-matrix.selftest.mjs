import { runAdversarialMatrix } from '../../src/physical_containment/adversarial-matrix.mjs';
let p=0,f=0;const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
const m=runAdversarialMatrix();
for(const c of m.cases) console.log((c.fail_closed?'OK   ':'BAD  ')+`[${c.group}] ${c.name} → ${c.observed}`);
ok(m.all_fail_closed===true,`ALL ${m.total} adversarial cases fail closed (0 false green)`);
// 17/20 spot checks
ok(m.cases.find(c=>/missing relay evidence/.test(c.name)).fail_closed,'17 missing relay evidence never passes');
ok(m.cases.find(c=>/hardware-assisted labeled physically severed/.test(c.name)).fail_closed,'20 hardware-assisted not labeled severed');
console.log(f===0?`\nALL GREEN: ${p}/${p}`:`\nRED: ${f}/${p+f}`);process.exit(f===0?0:1);
