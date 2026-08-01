#!/usr/bin/env node
// Loopback-only local operator run-server with session-token + Origin auth.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { handleStart, handleExport, REPO_ROOT } from './server-core.mjs';
import { newToken, authorize } from './session-token.mjs';

const PORT = Number(process.env.OP_PORT || 4880);
const HOST = '127.0.0.1'; // loopback only
const TOKEN = newToken();  // per-process session token
const MIME = { '.html':'text/html', '.css':'text/css', '.mjs':'text/javascript', '.js':'text/javascript', '.json':'application/json', '.png':'image/png' };
function readJsonBody(req){ return new Promise((res)=>{ let b=''; req.on('data',c=>{ b+=c; if(b.length>10000) req.destroy(); }); req.on('end',()=>{ try{res(JSON.parse(b||'{}'))}catch{res({})} }); }); }
function loopbackReq(req){ const o=req.headers['origin']; if(!o) return true; try{const u=new URL(o);return u.hostname==='127.0.0.1'||u.hostname==='localhost';}catch{return false;} }

const server = createServer(async (req, res) => {
  try {
    // session token: only served to loopback requests
    if (req.method === 'GET' && req.url === '/api/session') {
      if (!loopbackReq(req)) { res.writeHead(403); return res.end('forbidden'); }
      res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({ token: TOKEN }));
    }
    if (req.method === 'GET' && req.url === '/api/health') { res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({status:'ok',loopback:true,auth:true})); }
    if (req.method === 'POST' && (req.url === '/api/start' || req.url === '/api/export')) {
      const auth = authorize(req.headers, TOKEN);
      if (!auth.ok) { res.writeHead(403,{'content-type':'application/json'}); return res.end(JSON.stringify({status:'UNAUTHORIZED', reason: auth.reason})); }
      const out = req.url === '/api/start' ? handleStart(await readJsonBody(req)) : handleExport();
      res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify(out));
    }
    // static
    const urlPath = decodeURIComponent((req.url||'/').split('?')[0]);
    const abs = normalize(join(REPO_ROOT, urlPath));
    if (!abs.startsWith(REPO_ROOT)) { res.writeHead(403); return res.end('forbidden'); }
    const target = existsSync(abs) && abs.endsWith('/') ? join(abs,'index.html') : abs;
    if (!existsSync(target)) { res.writeHead(404); return res.end('not found'); }
    const data = await readFile(target);
    res.writeHead(200,{'content-type': MIME[extname(target)] || 'application/octet-stream'});
    res.end(data);
  } catch { res.writeHead(500); res.end('error'); }
});
server.listen(PORT, HOST, () => console.log(`local operator run-server on http://${HOST}:${PORT} (loopback only, token auth on)`));
