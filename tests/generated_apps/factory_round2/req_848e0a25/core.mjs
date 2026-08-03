// Habit Tracker core (pure, deterministic).
let _id = 0;
export function addHabit(s, name){ name=String(name||'').trim(); if(!name) return {ok:false,error:'EMPTY'}; return {ok:true, state:{habits:[...s.habits,{id:++_id,name,done:false}]}}; }
export function toggleToday(s, id){ return {ok:true, state:{habits:s.habits.map(h=>h.id===id?{...h,done:!h.done}:h)}}; }
export function resetAll(s){ return {ok:true, state:{habits:s.habits.map(h=>({...h,done:false}))}}; }
export function countDone(s){ return s.habits.filter(h=>h.done).length; }
export const initial = () => ({habits:[]});
