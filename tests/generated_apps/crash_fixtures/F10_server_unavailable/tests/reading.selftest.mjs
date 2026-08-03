import { addBook, toggleRead, removeBook, countRead, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
let s=initial();
s=addBook(s,'Dune').state; s=addBook(s,'1984').state; ok(s.books.length===2,'add two books');
ok(!addBook(s,'  ').ok,'reject empty title');
s=toggleRead(s,s.books[0].id).state; ok(countRead(s)===1,'mark read -> 1');
s=toggleRead(s,s.books[0].id).state; ok(countRead(s)===0,'unmark -> 0');
s=removeBook(s,s.books[0].id).state; ok(s.books.length===1,'remove book');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' reading selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}