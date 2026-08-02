// Drives the REAL loopback run-server end-to-end over 127.0.0.1 and records the loop.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.OP_PORT || 4899);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.DRIVE_OUT || '/private/tmp/claude-501/drive_out';
mkdirSync(OUT, { recursive: true });
const LOOPBACK_ORIGIN = { 'Origin': `http://127.0.0.1:${PORT}` };

const srv = spawn('node', ['src/operator_console/run-server.mjs'], { env: { ...process.env, OP_PORT: String(PORT) }, stdio: 'ignore' });
const jget = async (p, h={}) => { const r = await fetch(BASE+p, { headers: h }); return { code:r.status, body: await r.json().catch(()=>({})) }; };
const jpost = async (p, body, h={}) => { const r = await fetch(BASE+p, { method:'POST', headers:{'content-type':'application/json',...h}, body: JSON.stringify(body) }); return { code:r.status, body: await r.json().catch(()=>({})) }; };
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

let pass=0, fail=0; const t=(n,f)=>{ try{ f(); pass++; console.log('OK   '+n); }catch(e){ fail++; console.log('BAD  '+n+' :: '+e.message); } };
const rec = { transitions: [], loop: {} };
try {
  // wait for server ready (poll health)
  let ready=false; for (let i=0;i<50;i++){ try{ const h=await jget('/api/health'); if(h.body.status==='ok'){ready=true;break;} }catch{} await sleep(100); }
  t('server is up (loopback /api/health ok)', ()=>{ if(!ready) throw new Error('server not ready'); });
  rec.transitions.push('idle');

  const health = (await jget('/api/health')).body;
  const sess = await jget('/api/session', LOOPBACK_ORIGIN);
  t('session token issued to loopback', ()=>{ if(!sess.body.token || sess.body.token.length<32) throw new Error('no token'); });
  const TOK = { 'x-fg-token': sess.body.token, ...LOOPBACK_ORIGIN };

  // 1) unauthorized start (no token) -> UNAUTHORIZED
  const noauth = await jpost('/api/start', { objective:'x', target:'self-owned demo target' }, LOOPBACK_ORIGIN);
  t('start without token -> 403 UNAUTHORIZED', ()=>{ if(noauth.code!==403 || noauth.body.status!=='UNAUTHORIZED') throw new Error(JSON.stringify(noauth)); });

  // 2) empty objective -> INSUFFICIENT
  const empty = await jpost('/api/start', { objective:'', target:'self-owned demo target' }, TOK);
  t('empty objective -> INSUFFICIENT', ()=>{ if(empty.body.status!=='INSUFFICIENT') throw new Error(JSON.stringify(empty.body)); });

  // 3) forbidden/unknown target -> REFUSED
  const badtgt = await jpost('/api/start', { objective:'try', target:'http://evil/x' }, TOK);
  t('non-allowlisted target -> REFUSED', ()=>{ if(badtgt.body.status!=='REFUSED') throw new Error(JSON.stringify(badtgt.body)); });

  // 4) safe run -> complete
  rec.transitions.push('starting');
  const start = await jpost('/api/start', { objective:'Add input validation and prove tests pass', target:'self-owned demo target' }, TOK);
  rec.transitions.push('running');
  t('safe allowlisted run -> complete', ()=>{ if(start.body.status!=='complete') throw new Error(JSON.stringify(start.body)); });
  t('run decision is never SHIP', ()=>{ if(start.body.run && start.body.run.decision==='SHIP') throw new Error('SHIP leaked'); });
  rec.transitions.push('done');

  // 5) export -> sealed zip
  const exp = await jpost('/api/export', {}, TOK);
  t('export -> complete sealed zip, unzip_ok', ()=>{ if(exp.body.status!=='complete' || exp.body.unzip_ok!==true) throw new Error(JSON.stringify(exp.body)); });

  rec.loop = { health, start: start.body, export: exp.body, unauthorized: noauth.body, insufficient: empty.body, refused: badtgt.body };
  writeFileSync(join(OUT,'server_drive_result.json'), JSON.stringify(rec, null, 2));
} finally { srv.kill('SIGKILL'); }

console.log('transitions: '+rec.transitions.join(' -> '));
console.log(fail===0?`ALL GREEN: ${pass}/${pass+fail} server-drive checks passed.`:`RED: ${fail}/${pass+fail} failed`);
process.exit(fail===0?0:1);
