// Score Keeper core (pure).
let _id=0;
export function addPlayer(s,name){ name=String(name||'').trim(); if(!name) return {ok:false,error:'EMPTY'}; return {ok:true,state:{players:[...s.players,{id:++_id,name,score:0}]}}; }
export function changeScore(s,id,delta){ return {ok:true,state:{players:s.players.map(p=>p.id===id?{...p,score:p.score+delta}:p)}}; }
export function resetScores(s){ return {ok:true,state:{players:s.players.map(p=>({...p,score:0}))}}; }
export function leader(s){ return s.players.slice().sort((a,b)=>b.score-a.score)[0]||null; }
export const initial=()=>({players:[]});
