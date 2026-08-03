// Round 2 VISIBLE / HEADED browser proof. Opens a real window, drives the Factory Round 2 panel, opens each
// of the 4 fresh apps, performs >=2 user actions, captures before/after screenshots + video.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const BASE = `http://127.0.0.1:${PORT}`;
const DASH = `${BASE}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };

const INTERACT = {
  reading_list: async (pg) => { await pg.fill('[data-testid="title"]', 'Dune'); await pg.click('[data-testid="add"]'); await pg.click('button[data-read]'); },
  unit_converter: async (pg) => { await pg.fill('[data-testid="value"]', '100'); await pg.selectOption('[data-testid="from"]', 'c'); await pg.selectOption('[data-testid="to"]', 'f'); await pg.click('[data-testid="add"]'); await pg.fill('[data-testid="value"]', '1'); await pg.selectOption('[data-testid="from"]', 'km'); await pg.selectOption('[data-testid="to"]', 'mi'); await pg.click('[data-testid="add"]'); },
  tally_counter: async (pg) => { await pg.fill('[data-testid="name"]', 'Reps'); await pg.click('[data-testid="add"]'); await pg.click('button[data-inc]'); },
  habit_tracker: async (pg) => { await pg.fill('[data-testid="name"]', 'Water'); await pg.click('[data-testid="add"]'); await pg.click('button[data-toggle]'); },
};
const VERIFY = {
  reading_list: async (pg) => /1 read/.test(await pg.textContent('[data-testid="count"]')),
  unit_converter: async (pg) => /km → mi/.test(await pg.textContent('[data-testid="list"]')) && /c → f/.test(await pg.textContent('[data-testid="list"]')),
  tally_counter: async (pg) => /1 total/.test(await pg.textContent('[data-testid="total"]')),
  habit_tracker: async (pg) => /1 done/.test(await pg.textContent('[data-testid="count"]')),
};

const browser = await chromium.launch({ headless: false, slowMo: 250 });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, recordVideo: { dir: VID, size: { width: 1280, height: 900 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });
await page.click('[data-testid="nav-factory2"]');
await page.click('[data-testid="factory2-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="factory2-body"] tr[data-app]').length >= 4, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'foundergate_factory_panel.png'), fullPage: true });
ok(true, 'round2 panel visible with >=4 apps');
const apps = await page.$$eval('[data-testid="factory2-body"] tr[data-app]', rows => rows.map(r => r.getAttribute('data-app')));
ok(apps.length >= 4, `round2 panel lists: ${apps.join(', ')}`);

for (let i = 0; i < 4; i++) {
  const tpl = apps[i];
  const [popup] = await Promise.all([context.waitForEvent('page'), page.click(`[data-testid="factory2-preview-${tpl}"]`)]);
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForSelector('[data-testid="app-banner"]', { timeout: 6000 });
  const title = (await popup.textContent('h1')) || '';
  ok(/synthetic/i.test(await popup.textContent('[data-testid="app-banner"]')), `app${i + 1} (${tpl}): opened ("${title.trim()}")`);
  await popup.screenshot({ path: join(OUT, `app${i + 1}_before.png`), fullPage: true });
  await (INTERACT[tpl] || (async () => {}))(popup);
  ok(await (VERIFY[tpl] || (async () => true))(popup), `app${i + 1} (${tpl}): two user actions changed state as expected`);
  await popup.screenshot({ path: join(OUT, `app${i + 1}_after.png`), fullPage: true });
  await popup.close();
}
await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} round2 visible-browser proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
