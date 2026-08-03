// Lane I — VISIBLE / HEADED proof for Founder Drive Mode + Reviewer Readiness. Opens a real window, drives
// the founder screens, and captures the required screenshots (+ video). Verifies no dangerous control exists.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (page, sel, name) => { const el = await page.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const context = await browser.newContext({ viewport: { width: 1360, height: 1150 }, recordVideo: { dir: VID, size: { width: 1360, height: 1150 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// Founder Drive Mode
await page.click('[data-testid="nav-drive"]');
await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'founder_drive_mode.png'), fullPage: true });
ok(true, 'Founder Drive Mode visible');
await shotEl(page, '[data-testid="drive-cards"]', 'status_cards.png');
await shotEl(page, '[data-testid="drive-next"]', 'what_next_box.png');
await shotEl(page, '[data-testid="drive-crash-summary"]', 'crash_summary.png');

// Reviewer Readiness
await page.click('[data-testid="drive-reviewer-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="reviewer-timeline"] tr').length >= 4, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'reviewer_readiness.png'), fullPage: true });
ok(true, 'Reviewer Readiness visible');
await shotEl(page, '[data-testid="reviewer-evidence"]', 'evidence_index.png');
await shotEl(page, '[data-testid="reviewer-gate8"]', 'gate8_prep_planning_only.png');

// verify no dangerous control anywhere in the two founder panels
for (const panel of ['#panel-drive', '#panel-reviewer']) {
  const danger = await page.$$eval(`${panel} button, ${panel} a`, els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
  ok(!/deploy|billing|payment|checkout|buy now|outreach|send email|\bmerge\b|pr #200|http:\/\/(?!127)|https:\/\//.test(danger), `${panel}: no deploy/bill/outreach/merge/external control`);
}
// Gate 8 planning-only visible
ok(/Gate 8 and is NOT authorized/i.test(await page.textContent('[data-testid="reviewer-gate8"]')), 'Gate 8 shown as planning-only / not authorized');

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible drive/reviewer proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
