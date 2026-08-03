import { addEntry, removeEntry, clearAll, net, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
let s=initial();
s=addEntry(s,'Salary',100,'income').state; s=addEntry(s,'Coffee',30,'expense').state;
ok(net(s)===70,'net income 100 - expense 30 = 70');
ok(!addEntry(s,'x','notnum','expense').ok,'reject non-numeric amount');
ok(!addEntry(s,'',10,'income').ok,'reject empty label');
s=removeEntry(s,s.entries[1].id).state; ok(net(s)===100,'remove expense -> net 100');
s=clearAll(s).state; ok(net(s)===0 && s.entries.length===0,'clear -> net 0');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' budget selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}