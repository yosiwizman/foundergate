import { convert, addConversion, clearHistory, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
ok(convert(100,'c','f').value===212,'100c -> 212f');
ok(Math.abs(convert(1,'km','mi').value-0.621371)<1e-6,'1km -> ~0.621mi');
ok(convert(5,'m','x').ok===false,'unsupported pair -> error');
ok(convert('abc','km','mi').ok===false,'non-number -> error');
let s=initial(); s=addConversion(s,100,'c','f').state; s=addConversion(s,1,'km','mi').state;
ok(s.history.length===2,'history records conversions');
s=clearHistory(s).state; ok(s.history.length===0,'clear history');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' converter selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}