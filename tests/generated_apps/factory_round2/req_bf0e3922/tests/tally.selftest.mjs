import { addCounter, changeBy, resetAll, total, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
let s=initial();
s=addCounter(s,'Push-ups').state; ok(s.counters.length===1,'add counter');
ok(!addCounter(s,'').ok,'reject empty counter');
const id=s.counters[0].id;
s=changeBy(s,id,1).state; s=changeBy(s,id,1).state; ok(total(s)===2,'+1 +1 -> total 2');
s=changeBy(s,id,-5).state; ok(total(s)===0,'decrement clamps at 0');
s=changeBy(s,id,3).state; s=resetAll(s).state; ok(total(s)===0,'reset all -> 0');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' tally selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}