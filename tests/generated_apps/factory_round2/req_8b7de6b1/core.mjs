// Reading List core (pure).
let _id=0;
export function addBook(s,title){ title=String(title||'').trim(); if(!title) return {ok:false,error:'EMPTY'}; return {ok:true,state:{books:[...s.books,{id:++_id,title,read:false}]}}; }
export function toggleRead(s,id){ return {ok:true,state:{books:s.books.map(b=>b.id===id?{...b,read:!b.read}:b)}}; }
export function removeBook(s,id){ return {ok:true,state:{books:s.books.filter(b=>b.id!==id)}}; }
export function countRead(s){ return s.books.filter(b=>b.read).length; }
export const initial=()=>({books:[]});
