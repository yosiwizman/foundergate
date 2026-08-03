import { addHabit, toggleToday, resetAll, countDone, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
let s=initial();
s=addHabit(s,'Drink water').state; s=addHabit(s,'Read').state;
ok(s.habits.length===2,'add two habits');
ok(!addHabit(s,'   ').ok,'reject empty habit');
s=toggleToday(s,s.habits[0].id).state;
ok(countDone(s)===1,'toggle marks one done');
s=toggleToday(s,s.habits[0].id).state;
ok(countDone(s)===0,'toggle again unmarks');
s=toggleToday(s,s.habits[0].id).state; s=toggleToday(s,s.habits[1].id).state;
ok(countDone(s)===2,'both done');
s=resetAll(s).state; ok(countDone(s)===0,'resetAll clears day');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' habit selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}