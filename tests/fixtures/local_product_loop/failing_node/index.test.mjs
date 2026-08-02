// synthetic self-owned fixture: fails on purpose (honest failure demo)
const add=(a,b)=>a+b; if(add(2,2)!==5){ console.error('0/1 failing (expected)'); process.exit(1); }
