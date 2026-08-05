// W7/E — SELF-CONTAINED headed proof for the packaged GitHub App route UI. Serves the packaged_ui directory
// with an inline static server (no external dependency) so it runs from a clean extraction. Verifies local-only
// status, sandbox scope, app-NOT-installed, no key/token exposed, commit NOT ASSERTED, refusal (executable+catalog),
// replay local-simulation-only, next=true-founder-gate, and UNKNOWN-on-missing. Env: UI_DIR, OP_PORT, CV_OUT.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const UI_DIR = resolve(process.env.UI_DIR || 'docs/generated/github_app_readonly_local_macro_correction/packaged_ui');
const PORT = Number(process.env.OP_PORT || 4896);
const OUT = process.env.CV_OUT || UI_DIR;
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
let blockJson = false;
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (blockJson && p.endsWith('.json')) { res.writeHead(404); return res.end('blocked'); }
  const file = join(UI_DIR, p);
  if (!file.startsWith(UI_DIR) || !existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  try { const b = await readFile(file); res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'text/plain' }); res.end(b); }
  catch { res.writeHead(500); res.end('err'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };
const browser = await chromium.launch({ headless: false, slowMo: 110 });
const context = await browser.newContext({ viewport: { width: 1200, height: 1200 }, recordVideo: { dir: OUT, size: { width: 1200, height: 1200 } } });
const page = await context.newPage();
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
await page.click('[data-testid="ghapp-load-btn"]');
await page.waitForFunction(() => /LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS|UNKNOWN/.test(document.querySelector('[data-testid="ghapp-status"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'github_app_overview.png'), fullPage: true });
ok(true, 'packaged GitHub App route UI opened');

const status = await page.textContent('[data-testid="ghapp-status"]');
ok(/LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS/.test(status), `status LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS ("${status.trim()}")`);
ok(!/GITHUB_APP_PROVEN|SUPPORT_COMPLETE|PRODUCTION_READY|SECURITY_CERTIFIED|MERGE_READY/.test(status), 'no forbidden label');
await shotEl(page, '[data-testid="ghapp-status"]', 'route_status.png');
const perms = await page.textContent('[data-testid="ghapp-perms"]');
ok(/Contents: Read-only/.test(perms) && /Metadata: Read-only/.test(perms) && /sandbox-only/.test(perms), 'permissions sandbox-only Contents+Metadata read');
await shotEl(page, '[data-testid="ghapp-perms"]', 'permission_scope.png');
ok(/NO/.test(await page.textContent('[data-testid="ghapp-installed"]')), 'app installed: NO');
ok(/private key: NO/.test(await page.textContent('[data-testid="ghapp-secrets"]')) && /token: NO/.test(await page.textContent('[data-testid="ghapp-secrets"]')), 'no key/token exposed');
ok(/NOT ASSERTED/.test(await page.textContent('[data-testid="ghapp-commit"]')), 'exact commit NOT ASSERTED');
const refusal = await page.textContent('[data-testid="ghapp-refusal"]');
ok(/41 held/.test(refusal) && /39 executable/.test(refusal) && /2 catalog/.test(refusal), `refusal 41 held · 39 executable + 2 catalog ("${refusal.trim()}")`);
await shotEl(page, '[data-testid="ghapp-refusal"]', 'refusal_matrix.png');
ok(/REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY/.test(await page.textContent('[data-testid="ghapp-evidence"]')), 'evidence replay local-simulation-only');
await shotEl(page, '[data-testid="ghapp-evidence"]', 'evidence_replay.png');
const safety = await page.textContent('[data-testid="ghapp-safety"]');
ok(/existing\/customer: NO/.test(safety) && /code exec: NO/.test(safety) && /provider: NO/.test(safety), 'safety row: no existing/customer/code-exec/provider');
const next = await page.textContent('[data-testid="ghapp-next"]');
ok(/TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED/.test(next), 'next = TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED');
await shotEl(page, '[data-testid="ghapp-next"]', 'live_action_gate.png');
await shotEl(page, '[data-testid="ghapp-proven"]', 'blocked_customer_repo.png');

// UNKNOWN test — block the json and reload
blockJson = true;
await page.click('[data-testid="ghapp-load-btn"]'); await page.waitForTimeout(500);
ok(/UNKNOWN/.test(await page.textContent('[data-testid="ghapp-status"]')), 'missing evidence → UNKNOWN, not green');
await shotEl(page, '[data-testid="ghapp-status"]', 'unknown_missing_source.png');

const panelText = await page.textContent('body');
ok(!/ghs_[A-Za-z0-9]{20}/.test(panelText) && !/github_pat_[A-Za-z0-9_]{20}/.test(panelText) && !/BEGIN [A-Z ]*PRIVATE KEY/.test(panelText), 'no token/key value visible');

await page.waitForTimeout(200);
await context.close(); await browser.close(); server.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} packaged GitHub App route checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
