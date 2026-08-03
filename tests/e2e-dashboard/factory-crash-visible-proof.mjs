// Lane F — VISIBLE / HEADED crash-test proof. Opens a real window, drives the Crash Test panel, shows the
// failure fixtures with HOLD states + recoveries, proves no broken fixture is green, captures screenshots+video.
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

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const context = await browser.newContext({ viewport: { width: 1360, height: 1000 }, recordVideo: { dir: VID, size: { width: 1360, height: 1000 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });
await page.click('[data-testid="nav-crash"]');
await page.click('[data-testid="crash-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="crash-body"] tr[data-fixture]').length >= 5, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'crash_panel_overview.png'), fullPage: true });

const rows = await page.$$eval('[data-testid="crash-body"] tr[data-fixture]', trs => trs.map(tr => ({
  id: tr.getAttribute('data-fixture'),
  detected: tr.children[2]?.textContent.trim(),
  preview: tr.children[3]?.textContent.trim(),
  recovery: tr.children[5]?.textContent.trim(),
})));
ok(rows.length >= 5, `crash panel shows ${rows.length} fixtures (>=5)`);
ok(rows.filter(r => /HOLD/.test(r.detected)).length >= 3, `>=3 HOLD states shown (${rows.filter(r => /HOLD/.test(r.detected)).length})`);
ok(rows.filter(r => /RECOVERED_WITH_LIMITS/.test(r.recovery)).length >= 2, `>=2 RECOVERED_WITH_LIMITS shown (${rows.filter(r => /RECOVERED/.test(r.recovery)).length})`);
ok(rows.every(r => /BLOCKED/.test(r.preview)), 'no broken fixture has an allowed preview (all BLOCKED)');
ok(rows.every(r => /HOLD/.test(r.detected)), 'every fixture detected as HOLD (no green on broken)');

// element screenshots of specific fixture rows (distinct crops)
const shotRow = async (fixtureId, name) => { const el = await page.$(`tr[data-fixture="${fixtureId}"]`); if (el) await el.screenshot({ path: join(OUT, name) }); };
await shotRow('F01_missing_manifest', 'missing_manifest_hold.png');
await shotRow('F04_preview_mismatch', 'wrong_preview_hold.png');
await shotRow('F05_test_failure', 'test_failure_hold.png');
await shotRow('F07_stale_round1', 'stale_evidence_hold.png');
await shotRow('F02_corrupted_manifest', 'recovered_manifest.png'); // F02 row shows RECOVERED_WITH_LIMITS (distinct)
await shotRow('F10_server_unavailable', 'recovered_server.png');   // F10 row shows RECOVERED_WITH_LIMITS

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible crash-test proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
