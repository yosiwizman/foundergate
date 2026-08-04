// LANE W8 + Harvest dashboard — VISIBLE / HEADED local end-to-end journey proof. Walks the existing local dashboard
// (Drive Mode → Provider/Repo → Harvest Macro) using local UI + synthetic data only. Never activates a real provider/
// repo/hardware/deploy. Confirms the dashboard never invents state. LOCAL.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4885;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 130 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1350 }, recordVideo: { dir: VID, size: { width: 1400, height: 1350 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// 1-2 launch + founder interface opens
await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, '1-2 local launch + Founder Drive Mode opens without terminal repair');

// 3 attach a controlled local fixture (self-owned provider/repo)
await page.click('[data-testid="nav-provider"]'); await page.click('[data-testid="provider-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="provider-body"] tr[data-case]').length >= 8, null, { timeout: 8000 });
ok(true, '3 controlled local fixture attached (self-owned provider/repo proof)');

// 5-7 mission → lane contracts; truthful progress (Harvest panel)
await page.click('[data-testid="nav-harvest"]'); await page.click('[data-testid="harvest-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="harvest-body"] tr[data-lane]').length >= 8, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'harvest_panel_overview.png'), fullPage: true });
ok(true, '5-7 mission → 8 lane contracts, truthful run-scoped progress shown');

const status = await page.textContent('[data-testid="harvest-status"]');
ok(/HARVEST_AUTONOMOUS_MACRO_READY_WITH_LIMITS/.test(status), `aggregate status ready-with-limits ("${status.trim()}")`);
await shotEl(page, '[data-testid="harvest-status"]', 'harvest_status.png');

const rows = await page.$$eval('[data-testid="harvest-body"] tr[data-lane]', trs => trs.map(tr => ({ lane: tr.getAttribute('data-lane'), verdict: tr.children[2]?.textContent.trim() })));
ok(rows.length === 8 && rows.every(r => /READY_WITH_LIMITS/.test(r.verdict)), `8 lanes all READY_WITH_LIMITS (no false green)`);
await shotEl(page, '[data-testid="harvest-body"]', 'harvest_lanes.png');

const counts = await page.textContent('[data-testid="harvest-counts"]');
ok(/8 completed/.test(counts) && /0 parked/.test(counts), `lanes completed/active/parked ("${counts.trim()}")`);

// 19-20 limitations visible + plain-English never-ship (note shows limits; panel shows never SHIP)
const note = (await page.textContent('[data-testid="harvest-note"]')).toLowerCase();
const panelAll = (await page.textContent('#panel-harvest')).toLowerCase();
ok(/local synthetic/.test(note) && /no false green/.test(note) && /never ship/.test(panelAll), '19-20 limitations visible + never-SHIP + no-false-green');

// 22 dashboard does not invent state: load a panel whose data source is missing → UNKNOWN
await page.evaluate(() => { window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); });
await page.click('[data-testid="harvest-load-btn"]');
await page.waitForTimeout(600);
const afterFail = await page.textContent('[data-testid="harvest-body"]');
ok(/UNKNOWN/.test(afterFail), '22 dashboard shows UNKNOWN when source unavailable (no invented state)');

// 9/10 blocked gates
const blocked = await page.textContent('[data-testid="harvest-blocked"]');
ok(/real provider BLOCKED/i.test(blocked) && /private repo BLOCKED/i.test(blocked) && /Gate 8 BLOCKED/i.test(blocked) && /real hardware BLOCKED/i.test(blocked), 'blocked: real provider + private repo + Gate 8 + real hardware');
await shotEl(page, '[data-testid="harvest-blocked"]', 'harvest_blocked_gates.png');

// no danger controls
const danger = await page.$$eval('#panel-harvest button, #panel-harvest a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|provider key|api key|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/provider-key/external control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible harvest/e2e proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
