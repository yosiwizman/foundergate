// Tally Counter core (pure).
let _id=0;
export function addCounter(s,name){ name=String(name||'').trim(); if(!name) return {ok:false,error:'EMPTY'}; return {ok:true,state:{counters:[...s.counters,{id:++_id,name,count:0}]}}; }
export function changeBy(s,id,delta){ return {ok:true,state:{counters:s.counters.map(c=>c.id===id?{...c,count:Math.max(0,c.count+delta)}:c)}}; }
export function resetAll(s){ return {ok:true,state:{counters:s.counters.map(c=>({...c,count:0}))}}; }
export function total(s){ return s.counters.reduce((a,c)=>a+c.count,0); }
export const initial=()=>({counters:[]});
