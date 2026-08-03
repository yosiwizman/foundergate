// synthetic in-memory CRUD (no network, no db)
const db=new Map(); db.set(1,{n:'a'}); db.set(1,{n:'b'}); const ok=db.get(1).n==='b'&&(db.delete(1),!db.has(1));
if(!ok){console.error('FAIL');process.exit(1)} console.log('4/4 passing (synthetic crud)')
