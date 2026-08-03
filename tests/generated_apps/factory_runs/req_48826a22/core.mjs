// Notes Board core (pure).
let _id=0;
export function addNote(s,text){ text=String(text||'').trim(); if(!text) return {ok:false,error:'EMPTY'}; return {ok:true,state:{notes:[...s.notes,{id:++_id,text}]}}; }
export function editNote(s,id,text){ text=String(text||'').trim(); if(!text) return {ok:false,error:'EMPTY'}; return {ok:true,state:{notes:s.notes.map(n=>n.id===id?{...n,text}:n)}}; }
export function deleteNote(s,id){ return {ok:true,state:{notes:s.notes.filter(n=>n.id!==id)}}; }
export function clearAll(s){ return {ok:true,state:{notes:[]}}; }
export const initial=()=>({notes:[]});
