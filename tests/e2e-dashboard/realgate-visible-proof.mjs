// Lane 9 — VISIBLE / HEADED Real Provider Gate proof. Shows the one-call proof panel: provider, call count, budget,
// verification, provider-did-not-self-certify, blocked gates. LOCAL (reads the sealed evidence index only).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4886;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1250 }, recordVideo: { dir: VID, size: { width: 1400, height: 1250 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// Founder Drive Mode first
await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, 'Founder Drive Mode opened');

// Real Provider Gate
await page.click('[data-testid="nav-realgate"]'); await page.click('[data-testid="realgate-load-btn"]');
await page.waitForFunction(() => /openai/i.test(document.querySelector('[data-testid="realgate-provider"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'real_provider_gate_overview.png'), fullPage: true });
ok(true, 'Real Provider Gate panel opened');

const prov = await page.textContent('[data-testid="realgate-provider"]');
ok(/openai/i.test(prov) && /gpt-5-nano/.test(prov), `provider openai + model gpt-5-nano ("${prov.trim()}")`);

const cc = await page.textContent('[data-testid="realgate-callcount"]');
ok(/^1 /.test(cc.trim()) && /exactly one/.test(cc), `call count = 1 exactly one ("${cc.trim()}")`);
await shotEl(page, '[data-testid="realgate-callcount"]', 'call_count_and_budget.png');

const budget = await page.textContent('[data-testid="realgate-budget"]');
ok(/cap \$0\.25/.test(budget) && /used \$0\./.test(budget), `budget cap $0.25 + used shown ("${budget.trim()}")`);

const verify = await page.textContent('[data-testid="realgate-verify"]');
ok(/PROVIDER_RESPONSE_VERIFIED_WITH_LIMITS/.test(verify), `verification VERIFIED_WITH_LIMITS ("${verify.trim()}")`);
await shotEl(page, '[data-testid="realgate-verify"]', 'response_verification.png');

const selfcert = await page.textContent('[data-testid="realgate-selfcert"]');
ok(/^NO/.test(selfcert.trim()), `provider did NOT self-certify ("${selfcert.trim()}")`);

const output = await page.textContent('[data-testid="realgate-output"]');
ok(/synthetic/i.test(output) && /provider output alone is not acceptance/i.test(output), 'redacted synthetic output shows the refusal rule');

const blocked = await page.textContent('[data-testid="realgate-blocked"]');
ok(/private repo BLOCKED/i.test(blocked) && /Gate 8 BLOCKED/i.test(blocked) && /merge BLOCKED/i.test(blocked) && /2nd call BLOCKED/i.test(blocked), 'blocked: private repo + Gate 8 + merge + 2nd call');
await shotEl(page, '[data-testid="realgate-blocked"]', 'blocked_gates.png');

// no danger controls / no key visible
const panelText = (await page.textContent('#panel-realgate'));
ok(!/sk-[A-Za-z0-9]{20}/.test(panelText) && !/Bearer [A-Za-z0-9]{10}/.test(panelText), 'no API key / bearer token visible in panel');
const danger = await page.$$eval('#panel-realgate button, #panel-realgate a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|provider key|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/external control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible real-provider-gate proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
