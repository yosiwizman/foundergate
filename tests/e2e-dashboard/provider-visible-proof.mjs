// Lane I — VISIBLE / HEADED provider-agnostic proof. Opens a real window, shows Founder Drive Mode + the
// Provider/Repo Proof panel (4 simulated adapters PASS, hostile held, private repo held), captures screenshots.
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

const browser = await chromium.launch({ headless: false, slowMo: 180 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1250 }, recordVideo: { dir: VID, size: { width: 1400, height: 1250 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// Founder Drive Mode (entry)
await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, 'Founder Drive Mode opened');

// Provider / Repo Proof
await page.click('[data-testid="nav-provider"]'); await page.click('[data-testid="provider-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="provider-body"] tr[data-case]').length >= 8, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'provider_panel_overview.png'), fullPage: true });

const rows = await page.$$eval('[data-testid="provider-body"] tr[data-case]', trs => trs.map(tr => ({ c: tr.getAttribute('data-case'), status: tr.children[6]?.textContent.trim(), fg: tr.children[4]?.textContent.trim() })));
const passed = rows.filter(r => /PASS_VERIFIED/.test(r.status));
const held = rows.filter(r => !/PASS_VERIFIED/.test(r.status));
ok(passed.length >= 4, `>=4 providers PASS_VERIFIED (${passed.length})`);
ok(held.length >= 5 && held.every(r => /HOLD|REFUSED/.test(r.status)), `hostile cases held/refused (${held.length})`);
ok(!rows.some(r => /hostile/.test(r.c) && /PASS_VERIFIED/.test(r.status)), 'no hostile provider PASSED');

// element crops for the required named screenshots
await shotEl(page, 'tr[data-case="claude_code_simulated_build"]', 'claude_adapter_result.png');
await shotEl(page, 'tr[data-case="codex_openai_simulated_build"]', 'codex_openai_simulated_result.png');
await shotEl(page, 'tr[data-case="hermes_simulated_build"]', 'hermes_simulated_result.png');
await shotEl(page, 'tr[data-case="local_shell_deterministic_build"]', 'local_shell_result.png');
await shotEl(page, 'tr[data-case="hostile_no_files"]', 'hostile_provider_held.png');
await shotEl(page, '[data-testid="provider-repo-body"]', 'repo_check_result.png');
await shotEl(page, '[data-testid="provider-note"]', 'real_provider_blocked.png');
await shotEl(page, '#provider-repo-body tr:has-text("private")', 'private_repo_blocked.png');

// labels + repo private held + no danger controls
const labels = await page.textContent('[data-testid="provider-labels"]');
ok(/real provider activation requires a founder gate/i.test(labels) && /private repo access requires a founder gate/i.test(labels), 'labels: real-provider + private-repo require a founder gate');
const repoTxt = await page.textContent('[data-testid="provider-repo-body"]');
ok(/HELD_UNSUPPORTED_OR_PRIVATE/.test(repoTxt), 'private repo request → HELD');
const danger = await page.$$eval('#panel-provider button, #panel-provider a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|provider key|api key|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/provider-key/external control');

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible provider proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
