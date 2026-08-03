import { addPlayer, changeScore, resetScores, leader, initial } from '../core.mjs';
let p=0,f=0; const ok=(c,m)=>{c?p++:(f++,console.error('FAIL: '+m));};
let s=initial();
s=addPlayer(s,'Ann').state; s=addPlayer(s,'Bob').state; ok(s.players.length===2,'add players');
ok(!addPlayer(s,'').ok,'reject empty player');
const a=s.players[0].id;
s=changeScore(s,a,1).state; s=changeScore(s,a,1).state; ok(s.players[0].score===2,'+1 +1 -> 2');
s=changeScore(s,a,-1).state; ok(s.players[0].score===1,'-1 -> 1');
ok(leader(s).name==='Ann','leader is Ann');
s=resetScores(s).state; ok(s.players.every(x=>x.score===0),'reset scores');
const t=p+f; if(f===0){console.log('ALL GREEN: '+p+'/'+t+' score selftest(s) passed.');process.exit(0);} else {console.error('RED: '+f+'/'+t+' failed.');process.exit(1);}