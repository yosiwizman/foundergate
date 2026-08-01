#!/usr/bin/env node
// Loopback-only local operator run-server. Serves the dashboard static files AND
// /api/start + /api/export. Binds 127.0.0.1 ONLY. No external network, no provider.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, normalize } from 'node:path';
import { handleStart, handleExport, REPO_ROOT } from './server-core.mjs';

const PORT = Number(process.env.OP_PORT || 4880);
const HOST = '127.0.0.1'; // loopback only
const MIME = { '.html':'text/html', '.css':'text/css', '.mjs':'text/javascript', '.js':'text/javascript', '.json':'application/json', '.png':'image/png' };

function readJsonBody(req){ return new Promise((res)=>{ let b=''; req.on('data',c=>{ b+=c; if(b.length>10000) req.destroy(); }); req.on('end',()=>{ try{res(JSON.parse(b||'{}'))}catch{res({})} }); }); }

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/start') { const out = handleStart(await readJsonBody(req)); res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify(out)); }
    if (req.method === 'POST' && req.url === '/api/export') { const out = handleExport(); res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify(out)); }
    if (req.method === 'GET' && req.url === '/api/health') { res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({status:'ok',loopback:true})); }
    // static: serve from repo root, prevent traversal
    const urlPath = decodeURIComponent((req.url||'/').split('?')[0]);
    const abs = normalize(join(REPO_ROOT, urlPath));
    if (!abs.startsWith(REPO_ROOT)) { res.writeHead(403); return res.end('forbidden'); }
    const target = existsSync(abs) && abs.endsWith('/') ? join(abs,'index.html') : abs;
    if (!existsSync(target)) { res.writeHead(404); return res.end('not found'); }
    const data = await readFile(target);
    res.writeHead(200,{'content-type': MIME[extname(target)] || 'application/octet-stream'});
    res.end(data);
  } catch (e) { res.writeHead(500); res.end('error'); }
});
server.listen(PORT, HOST, () => console.log(`local operator run-server on http://${HOST}:${PORT} (loopback only)`));
