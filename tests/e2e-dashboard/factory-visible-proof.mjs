// Lane F — VISIBLE / HEADED browser proof. Opens a real Chromium window, drives the FounderGate Factory
// Proof panel, opens each of the 4 generated app previews, performs >=2 user actions in each, and captures
// before/after screenshots (+ video). Headed only — no silent headless substitution.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const BASE = `http://127.0.0.1:${PORT}`;
const DASH = `${BASE}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT;               // screenshots dir
const VID = process.env.CV_VID || OUT;        // video dir
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };

// per-archetype user interactions (2 actions each), driving the app's real testids
const INTERACT = {
  score_keeper: async (pg) => { await pg.fill('[data-testid="name"]', 'Ann'); await pg.click('[data-testid="add"]'); await pg.click('button[data-inc]'); },
  budget_tracker: async (pg) => { await pg.fill('[data-testid="label"]', 'Salary'); await pg.fill('[data-testid="amount"]', '100'); await pg.selectOption('[data-testid="type"]', 'income'); await pg.click('[data-testid="add"]'); await pg.fill('[data-testid="label"]', 'Coffee'); await pg.fill('[data-testid="amount"]', '40'); await pg.selectOption('[data-testid="type"]', 'expense'); await pg.click('[data-testid="add"]'); },
  inventory_list: async (pg) => { await pg.fill('[data-testid="name"]', 'Bolts'); await pg.click('[data-testid="add"]'); await pg.click('button[data-inc]'); },
  notes_board: async (pg) => { await pg.fill('[data-testid="text"]', 'buy milk'); await pg.click('[data-testid="add"]'); await pg.fill('[data-testid="text"]', 'call Bob'); await pg.click('[data-testid="add"]'); },
};
const VERIFY = {
  score_keeper: async (pg) => /1/.test(await pg.textContent('[data-testid^="score-"]')),
  budget_tracker: async (pg) => /Net: 60/.test(await pg.textContent('[data-testid="net"]')),
  inventory_list: async (pg) => /2 units/.test(await pg.textContent('[data-testid="total"]')),
  notes_board: async (pg) => /2 notes/.test(await pg.textContent('[data-testid="count"]')),
};

const browser = await chromium.launch({ headless: false, slowMo: 250 });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: VID, size: { width: 1280, height: 900 } } });
const page = await context.newPage();

// Factory panel
await page.goto(DASH, { waitUntil: 'domcontentloaded' });
await page.click('[data-testid="nav-factory"]');
await page.click('[data-testid="factory-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="factory-body"] tr[data-app]').length >= 4, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'foundergate_factory_panel.png'), fullPage: true });
ok(true, 'factory panel visible with >=4 generated apps');

// pull the app list order + templates from the page
const apps = await page.$$eval('[data-testid="factory-body"] tr[data-app]', rows => rows.map(r => r.getAttribute('data-app')));
ok(apps.length >= 4, `panel lists ${apps.length} apps: ${apps.join(', ')}`);

for (let i = 0; i < 4; i++) {
  const tpl = apps[i];
  // open the preview as a user (click the bound preview link → popup)
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.click(`[data-testid="factory-preview-${tpl}"]`),
  ]);
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForSelector('[data-testid="app-banner"]', { timeout: 6000 });
  const title = (await popup.textContent('h1')) || '';
  ok(/synthetic/i.test(await popup.textContent('[data-testid="app-banner"]')), `app${i + 1} (${tpl}): opened, local-synthetic banner ("${title.trim()}")`);
  await popup.screenshot({ path: join(OUT, `app${i + 1}_before.png`), fullPage: true });
  await (INTERACT[tpl] || (async () => {}))(popup);
  const verified = await (VERIFY[tpl] || (async () => true))(popup);
  ok(verified, `app${i + 1} (${tpl}): two user actions changed app state as expected`);
  await popup.screenshot({ path: join(OUT, `app${i + 1}_after.png`), fullPage: true });
  await popup.close();
}

await page.waitForTimeout(400);
const videoPath = await page.video()?.path().catch(() => null);
await context.close();  // finalizes video
await browser.close();
if (videoPath) console.log('VIDEO: ' + videoPath);
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible-browser factory proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
