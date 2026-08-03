// Budget Tracker core (fake amounts only, pure).
let _id=0;
export function addEntry(s,label,amount,type){ label=String(label||'').trim(); amount=Number(amount); if(!label||!Number.isFinite(amount)) return {ok:false,error:'INVALID'}; if(type!=='income'&&type!=='expense') type='expense'; return {ok:true,state:{entries:[...s.entries,{id:++_id,label,amount,type}]}}; }
export function removeEntry(s,id){ return {ok:true,state:{entries:s.entries.filter(e=>e.id!==id)}}; }
export function clearAll(s){ return {ok:true,state:{entries:[]}}; }
export function net(s){ return s.entries.reduce((a,e)=>a+(e.type==='income'?e.amount:-e.amount),0); }
export const initial=()=>({entries:[]});
