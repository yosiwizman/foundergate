import { addNote, editNote, deleteNote, clearAll, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
let s=initial();
s=addNote(s,'buy milk').state; ok(s.notes.length===1,'add note');
ok(!addNote(s,'  ').ok,'reject empty note');
s=editNote(s,s.notes[0].id,'buy oat milk').state; ok(s.notes[0].text==='buy oat milk','edit note');
s=addNote(s,'second').state; s=deleteNote(s,s.notes[0].id).state; ok(s.notes.length===1 && s.notes[0].text==='second','delete note');
s=clearAll(s).state; ok(s.notes.length===0,'clear all');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' notes selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}