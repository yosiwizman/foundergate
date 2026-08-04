// W7 — VISIBLE / HEADED GitHub App Read-Only Route proof (LOCAL ONLY). Shows the local-only route status,
// sandbox-only scope, required permissions, live-action gate, app-NOT-installed, no key/token exposed,
// commit NOT ASSERTED, 34/34 refusal matrix, evidence replay (local-simulation-only), and UNKNOWN-on-missing.
// Must NOT show GITHUB_APP_PROVEN / *_SUPPORT_COMPLETE / PRODUCTION_READY / SECURITY_CERTIFIED / MERGE_READY.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4895;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 120 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1650 }, recordVideo: { dir: VID, size: { width: 1400, height: 1650 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

await page.click('[data-testid="nav-ghapp"]'); await page.click('[data-testid="ghapp-load-btn"]');
await page.waitForFunction(() => /LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS|UNKNOWN/.test(document.querySelector('[data-testid="ghapp-status"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'github_app_overview.png'), fullPage: true });
ok(true, 'GitHub App Route panel opened');

const status = await page.textContent('[data-testid="ghapp-status"]');
ok(/LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS/.test(status), `status LOCAL_GITHUB_APP_ROUTE_READY_WITH_LIMITS ("${status.trim()}")`);
ok(!/GITHUB_APP_PROVEN|SUPPORT_COMPLETE|PRODUCTION_READY|SECURITY_CERTIFIED|MERGE_READY/.test(status), 'no forbidden label in status');
await shotEl(page, '[data-testid="ghapp-status"]', 'route_status.png');

const mode = await page.textContent('[data-testid="ghapp-mode"]');
ok(/LOCAL/.test(mode) && /live proof requires a founder gate/i.test(mode), `mode local-only, live proof gated ("${mode.trim()}")`);

const perms = await page.textContent('[data-testid="ghapp-perms"]');
ok(/Contents: Read-only/.test(perms) && /Metadata: Read-only/.test(perms) && /sandbox-only/.test(perms), `permissions sandbox-only Contents+Metadata read ("${perms.trim()}")`);
await shotEl(page, '[data-testid="ghapp-perms"]', 'permission_scope.png');

const installed = await page.textContent('[data-testid="ghapp-installed"]');
ok(/NO/.test(installed), `app installed: NO ("${installed.trim()}")`);

const secrets = await page.textContent('[data-testid="ghapp-secrets"]');
ok(/private key exposed: NO/.test(secrets) && /installation token exposed: NO/.test(secrets), 'no private key / installation token exposed');

const commit = await page.textContent('[data-testid="ghapp-commit"]');
ok(/NOT ASSERTED/.test(commit), `exact commit NOT ASSERTED (no live intake) ("${commit.trim()}")`);

const refusal = await page.textContent('[data-testid="ghapp-refusal"]');
ok(/34 cases · all held: YES/.test(refusal), `refusal matrix 34/34 ("${refusal.trim()}")`);
await shotEl(page, '[data-testid="ghapp-refusal"]', 'refusal_matrix.png');

const evidence = await page.textContent('[data-testid="ghapp-evidence"]');
ok(/REPLAY_VERIFIED_LOCAL_SIMULATION_ONLY/.test(evidence), `evidence replay local-simulation-only ("${evidence.trim()}")`);
await shotEl(page, '[data-testid="ghapp-evidence"]', 'evidence_replay.png');

const safety = await page.textContent('[data-testid="ghapp-safety"]');
ok(/existing\/customer repo: NO/.test(safety) && /code exec: NO/.test(safety) && /provider: NO/.test(safety), 'safety row: no existing/customer repo, no code exec, no provider');

const next = await page.textContent('[data-testid="ghapp-next"]');
ok(/TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED/.test(next), `next = TRUE_FOUNDER_GATE_GITHUB_APP_LIVE_ACTION_REQUIRED ("${next.trim().slice(0,60)}…")`);
await shotEl(page, '[data-testid="ghapp-next"]', 'live_action_gate.png');

const blocked = await page.textContent('[data-testid="ghapp-blocked"]');
ok(/live app create TRUE_FOUNDER_GATE/.test(blocked) && /existing repo BLOCKED/.test(blocked) && /customer repo BLOCKED/.test(blocked) && /PR#200 UNTOUCHED/.test(blocked) && /protected main UNTOUCHED/.test(blocked), 'blocked: live app create/install/token gated; existing+customer repo blocked; PR#200+main untouched');
await shotEl(page, '[data-testid="ghapp-blocked"]', 'blocked_customer_repo.png');

// UNKNOWN test
await page.evaluate(() => { window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); });
await page.click('[data-testid="ghapp-load-btn"]'); await page.waitForTimeout(500);
const afterFail = await page.textContent('[data-testid="ghapp-status"]');
ok(/UNKNOWN/.test(afterFail), 'missing evidence → UNKNOWN, not green');
await shotEl(page, '[data-testid="ghapp-status"]', 'unknown_missing_source.png');

// no secret/token in panel; no danger controls
const panelText = await page.textContent('#panel-ghapp');
ok(!/ghs_[A-Za-z0-9]{20}/.test(panelText) && !/github_pat_[A-Za-z0-9_]{20}/.test(panelText) && !/BEGIN [A-Z ]*PRIVATE KEY/.test(panelText) && !/Bearer [A-Za-z0-9]{20}/.test(panelText), 'no token/key/bearer value visible in panel');
const danger = await page.$$eval('#panel-ghapp button, #panel-ghapp a', els => els.map(e => (e.textContent||'').toLowerCase()+'|'+(e.getAttribute('href')||'')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|\bmerge\b|http:\/\/(?!127)|https:\/\/(?!github)/.test(danger), 'no deploy/bill/merge/external control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible GitHub App route checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
