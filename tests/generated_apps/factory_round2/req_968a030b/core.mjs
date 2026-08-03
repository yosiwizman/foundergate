// Unit Converter core (pure). Supported: km<->mi, c<->f, kg<->lb.
let _id=0;
export function convert(value, from, to){ value=Number(value); if(!Number.isFinite(value)) return {ok:false,error:'NAN'}; if(from===to) return {ok:true,value}; const key=from+'>'+to; const M={'km>mi':v=>v*0.621371,'mi>km':v=>v*1.60934,'c>f':v=>v*9/5+32,'f>c':v=>(v-32)*5/9,'kg>lb':v=>v*2.20462,'lb>kg':v=>v*0.453592}; if(!M[key]) return {ok:false,error:'UNSUPPORTED_PAIR'}; return {ok:true,value:M[key](value)}; }
export function addConversion(s,value,from,to){ const r=convert(value,from,to); if(!r.ok) return {ok:false,error:r.error}; return {ok:true,state:{history:[...s.history,{id:++_id,value:Number(value),from,to,result:r.value}]}}; }
export function clearHistory(s){ return {ok:true,state:{history:[]}}; }
export const initial=()=>({history:[]});
