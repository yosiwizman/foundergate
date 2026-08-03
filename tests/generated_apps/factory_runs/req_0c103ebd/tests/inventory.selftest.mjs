import { addItem, changeQty, removeItem, totalUnits, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
let s=initial();
s=addItem(s,'Bolts',2).state; ok(totalUnits(s)===2,'add item qty 2');
ok(!addItem(s,'',3).ok,'reject empty name');
s=changeQty(s,s.items[0].id,1).state; ok(totalUnits(s)===3,'increment -> 3');
s=changeQty(s,s.items[0].id,-5).state; ok(totalUnits(s)===0,'decrement clamps at 0');
s=addItem(s,'Nuts',4).state; s=removeItem(s,s.items[0].id).state; ok(s.items.length===1 && totalUnits(s)===4,'remove item');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' inventory selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}