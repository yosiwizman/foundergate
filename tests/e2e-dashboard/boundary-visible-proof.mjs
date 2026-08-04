// Lane N — VISIBLE / HEADED Boundary Assurance proof. Shows Founder Drive Mode, Provider/Repo Proof, Core IP,
// and the Boundary Assurance / Flight Recorder panel (good fixture verified; bad fixtures held/stopped/quarantined;
// monitoring-loss fail-closed; blocked gates). Captures the nine required screenshots. LOCAL only.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4883;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 140 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1500 }, recordVideo: { dir: VID, size: { width: 1400, height: 1500 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// 1. Founder Drive Mode
await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, '1 Founder Drive Mode opened');
// 2. Provider / Repo Proof
await page.click('[data-testid="nav-provider"]'); await page.click('[data-testid="provider-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="provider-body"] tr[data-case]').length >= 8, null, { timeout: 8000 });
ok(true, '2 Provider / Repo Proof opened');
// 3. Core IP
await page.click('[data-testid="nav-coreip"]'); await page.click('[data-testid="coreip-load-btn"]');
await page.waitForFunction(() => /primitives/.test(document.querySelector('[data-testid="coreip-coverage"]')?.textContent || ''), null, { timeout: 8000 });
ok(true, '3 Core IP / Assumption Verification opened');
// 4. Boundary Assurance
await page.click('[data-testid="nav-boundary"]'); await page.click('[data-testid="boundary-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="boundary-body"] tr[data-fixture]').length >= 16, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'boundary_panel_overview.png'), fullPage: true });
ok(true, '4 Boundary Assurance / Flight Recorder panel opened (16 fixtures)');

// contract digest
const cd = await page.textContent('[data-testid="boundary-contract"]');
ok(/erc_/.test(cd), `run contract digest shown ("${cd.trim()}")`);
await shotEl(page, '[data-testid="boundary-contract"]', 'run_contract_digest.png');
await shotEl(page, '[data-testid="boundary-summary"]', 'pre_run_attestation.png');

const rows = await page.$$eval('[data-testid="boundary-body"] tr[data-fixture]', trs => trs.map(tr => ({ f: tr.getAttribute('data-fixture'), verdict: tr.children[1]?.textContent.trim(), founder: tr.children[2]?.textContent.trim() })));
const good = rows.find(r => r.f === 'F01');
// 5. good fixture verified
ok(good && /VERIFIED_WITHIN_BOUNDARIES/.test(good.verdict), '5 good fixture → VERIFIED_WITHIN_BOUNDARIES');
// 6. at least 5 bad fixtures stopped/held/quarantined
const bad = rows.filter(r => r.f !== 'F01');
const held = bad.filter(r => /HOLD|STOP|QUARANTINE|MONITORING_LOST|BOUNDARY_VIOLATION|UNKNOWN/.test(r.verdict));
ok(held.length >= 5 && !bad.some(r => /VERIFIED_WITHIN_BOUNDARIES/.test(r.verdict)), `6 ${held.length} bad fixtures held/stopped/quarantined, 0 false green`);
await shotEl(page, '[data-testid="boundary-body"]', 'challenge_results.png');
await shotEl(page, 'tr[data-fixture="F14"]', 'expected_vs_observed.png');
await shotEl(page, 'tr[data-fixture="F10"]', 'containment_decision.png');
// 7. monitoring-loss fail-closed
const mon = rows.find(r => r.f === 'F11');
ok(mon && /MONITORING_LOST/.test(mon.verdict), '7 monitoring-loss fixture → MONITORING_LOST (fail closed)');
// 8. evidence plane completeness / false-green count
const fg = await page.textContent('[data-testid="boundary-falsegreen"]');
ok(/false-green: 0/.test(fg) && /"secure": 0/.test(fg), `8 false-green 0 + "secure" 0 ("${fg.trim()}")`);
await shotEl(page, '[data-testid="boundary-falsegreen"]', 'evidence_plane.png');
await shotEl(page, 'tr[data-fixture="F13"]', 'post_run_verification.png');
// 9/10. blocked gates
const blocked = await page.textContent('[data-testid="boundary-blocked"]');
ok(/real provider BLOCKED/i.test(blocked) && /private repo BLOCKED/i.test(blocked) && /Gate 8 BLOCKED/i.test(blocked) && /external network BLOCKED/i.test(blocked), '9 blocked: real provider + private repo + Gate 8 + external network');
await shotEl(page, '[data-testid="boundary-blocked"]', 'blocked_gates.png');

// no danger controls
const danger = await page.$$eval('#panel-boundary button, #panel-boundary a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|provider key|api key|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/provider-key/external control in panel');

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible boundary proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
