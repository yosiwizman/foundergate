// Inventory List core (pure).
let _id=0;
export function addItem(s,name,qty){ name=String(name||'').trim(); qty=Number(qty); if(!name) return {ok:false,error:'EMPTY'}; if(!Number.isFinite(qty)||qty<0) qty=0; return {ok:true,state:{items:[...s.items,{id:++_id,name,qty}]}}; }
export function changeQty(s,id,delta){ return {ok:true,state:{items:s.items.map(i=>i.id===id?{...i,qty:Math.max(0,i.qty+delta)}:i)}}; }
export function removeItem(s,id){ return {ok:true,state:{items:s.items.filter(i=>i.id!==id)}}; }
export function totalUnits(s){ return s.items.reduce((a,i)=>a+i.qty,0); }
export const initial=()=>({items:[]});
