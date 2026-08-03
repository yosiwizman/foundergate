// Boundary Monitoring self-test — proof 26 (drift → PAUSE/STOP/QUARANTINE). LOCAL / DETERMINISTIC.
import { monitorBoundaries, monitorDimension } from '../../src/boundary_monitoring/boundary-monitor.mjs';
let p=0,f=0; const ok=(c,m)=>{if(c){p++;console.log('OK   '+m)}else{f++;console.log('BAD  '+m)}};
// 26 drift produces PAUSE/STOP/QUARANTINE
ok(monitorDimension('secret','s1','s2').action === 'QUARANTINE', '26a secret drift → QUARANTINE');
ok(monitorDimension('network','n1','n2').action === 'QUARANTINE', '26b network drift → QUARANTINE');
ok(monitorDimension('tool','t1','t2').action === 'STOP', '26c tool drift → STOP');
ok(monitorDimension('mount', undefined, 'm').action === 'PAUSE', '26d unknown dimension → PAUSE');
ok(monitorDimension('process','p1','p1').action === 'CONTINUE', '26e no drift → CONTINUE');
const overall = monitorBoundaries({ baseline: { secret:'a', network:'n', tool:'t', permission:'p', mount:'m', process:'pr', environment:'e', runtime_policy:'rp' }, current: { secret:'a', network:'n', tool:'CHANGED', permission:'p', mount:'m', process:'pr', environment:'e', runtime_policy:'rp' } });
ok(overall.overall_action === 'STOP' && overall.drifts === 1, 'overall action escalates to STOP on one tool drift');
console.log(f===0?`\nALL GREEN: ${p}/${p} boundary-monitor proofs passed.`:`\nRED: ${f}/${p+f} failed.`);
process.exit(f===0?0:1);
