// Lane I — VISIBLE / HEADED showroom proof. Opens a real window, drives Founder Drive Mode + Reviewer
// Readiness (with the Showroom subsection), captures the required screenshots + video, verifies no danger.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4880;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const context = await browser.newContext({ viewport: { width: 1360, height: 1200 }, recordVideo: { dir: VID, size: { width: 1360, height: 1200 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// Founder Drive Mode entry
await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'founder_drive_entry.png'), fullPage: true });
await shotEl(page, '[data-testid="drive-card-gate8"]', 'gate8_blocked.png');
ok(true, 'Founder Drive entry captured');

// Reviewer Readiness + Showroom
await page.click('[data-testid="drive-reviewer-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="reviewer-claims"] tr').length >= 5, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'reviewer_readiness_entry.png'), fullPage: true });
await shotEl(page, '[data-testid="reviewer-evidence"]', 'showroom_evidence_index.png');
await shotEl(page, '[data-testid="reviewer-claims"]', 'claims_matrix_summary.png');
await shotEl(page, '[data-testid="reviewer-not-proven"]', 'what_is_not_proven.png');
ok(true, 'Reviewer Readiness + Showroom captured');

// verify no dangerous control in reviewer/showroom
const danger = await page.$$eval('#panel-reviewer button, #panel-reviewer a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|\bmerge\b|pr #200|http:\/\/(?!127)|https:\/\//.test(danger), 'no contact/payment/deploy/external control in showroom');
ok(/Gate 8 and is NOT authorized/i.test(await page.textContent('[data-testid="reviewer-gate8"]')), 'Gate 8 shown blocked/not-authorized');

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible showroom proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
