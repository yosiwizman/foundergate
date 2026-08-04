// W9 + local E2E — VISIBLE / HEADED Private Repo Read-Only Gate proof. Shows readiness status, synthetic fixture,
// exact commit/snapshot, secret classifier, refusal matrix, evidence replay, blocked gates, next founder gate.
// Also proves the dashboard shows UNKNOWN when the source is unavailable. LOCAL synthetic only.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4888;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 140 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1400 }, recordVideo: { dir: VID, size: { width: 1400, height: 1400 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// 1-2 founder opens dashboard + panel visible
await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, '1-2 dashboard opens + Founder Drive Mode');
await page.click('[data-testid="nav-privrepo"]'); await page.click('[data-testid="privrepo-load-btn"]');
await page.waitForFunction(() => /READY_WITH_LIMITS|PARTIAL/.test(document.querySelector('[data-testid="privrepo-status"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'private_repo_gate_overview.png'), fullPage: true });
ok(true, '2 Private Repo Read-Only Gate panel visible');

// 3-4 synthetic fixture + resolved identity + exact commit
const fixture = await page.textContent('[data-testid="privrepo-fixture"]');
ok(/synthetic/i.test(fixture) && /a1b2c3d4e5f6/.test(fixture), `3-5 synthetic fixture + exact commit ("${fixture.trim()}")`);
await shotEl(page, '[data-testid="privrepo-status"]', 'credential_gate.png');

// 6 secret classifier
const secrets = await page.textContent('[data-testid="privrepo-secrets"]');
ok(/HELD_SENSITIVE_FILES/.test(secrets) && /held/.test(secrets), `6 secret classifier holds sensitive files ("${secrets.trim()}")`);

// 7 write attempts refused (25/25)
const refusal = await page.textContent('[data-testid="privrepo-refusal"]');
ok(/all held: YES/.test(refusal), `7 write-attempt refusal matrix all held ("${refusal.trim()}")`);
await shotEl(page, '[data-testid="privrepo-refusal"]', 'refusal_matrix.png');

// 8 evidence replay
const evidence = await page.textContent('[data-testid="privrepo-evidence"]');
ok(/REPLAY_VERIFIED/.test(evidence), `8 evidence replay reconstructs decision ("${evidence.trim()}")`);
await shotEl(page, '[data-testid="privrepo-evidence"]', 'evidence_replay.png');

// 9 no real access + not-proven visible
const proven = await page.textContent('[data-testid="privrepo-proven"]');
const note = (await page.textContent('[data-testid="privrepo-note"]')).toLowerCase();
ok(/actual private repo access/i.test(proven) && /no real private repo was accessed/.test(note), '9 UI shows no real private repo accessed + not-proven list');

// 10 next founder gate
const next = await page.textContent('[data-testid="privrepo-next"]');
ok(/real private repo read-only access/i.test(next) && /founder phrase/i.test(next), '10 UI shows next founder gate required');

// blocked gates
const blocked = await page.textContent('[data-testid="privrepo-blocked"]');
ok(/real private repo BLOCKED/i.test(blocked) && /real credential BLOCKED/i.test(blocked) && /code exec BLOCKED/i.test(blocked) && /write\/merge BLOCKED/i.test(blocked), 'blocked: real private repo + real credential + code exec + write/merge');
await shotEl(page, '[data-testid="privrepo-blocked"]', 'blocked_real_access_gate.png');

// 11 dashboard shows UNKNOWN when source unavailable (false-green check)
await page.evaluate(() => { window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); });
await page.click('[data-testid="privrepo-load-btn"]'); await page.waitForTimeout(500);
const afterFail = await page.textContent('[data-testid="privrepo-status"]');
ok(/UNKNOWN/.test(afterFail), '11 missing evidence → UNKNOWN, not green');

// no secret/token visible; no danger controls
const panelText = await page.textContent('#panel-privrepo');
ok(!/gh[pousr]_[A-Za-z0-9]{20}/.test(panelText.replace(/FAKE|TEST/g, '')) && !/Bearer [A-Za-z0-9]{20}/.test(panelText), 'no real token/bearer visible in panel');
const danger = await page.$$eval('#panel-privrepo button, #panel-privrepo a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/external control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible private-repo readiness proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
