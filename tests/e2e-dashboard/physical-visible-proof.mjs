// Lane P — VISIBLE / HEADED Physical Containment proof. Shows Founder Drive Mode, Boundary Assurance, and the
// Physical Containment Assurance panel (Level 1/2/3 separation, path inventory, relay/power/evidence-channel,
// capability gate, claim blocker, adversarial matrix, blocked gates). Captures the nine required screenshots. LOCAL.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4884;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 130 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1600 }, recordVideo: { dir: VID, size: { width: 1400, height: 1600 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

// 1. Founder Drive Mode
await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, '1 Founder Drive Mode opened');
// 2. Boundary Assurance
await page.click('[data-testid="nav-boundary"]'); await page.click('[data-testid="boundary-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="boundary-body"] tr[data-fixture]').length >= 16, null, { timeout: 8000 });
ok(true, '2 Boundary Assurance / Flight Recorder opened');
// 3. Physical Containment
await page.click('[data-testid="nav-physical"]'); await page.click('[data-testid="physical-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="physical-paths"] tr').length >= 14, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'physical_panel_overview.png'), fullPage: true });
ok(true, '3 Physical Containment Assurance panel opened');

// 4. Level 1/2/3 separation
const levels = await page.textContent('[data-testid="physical-levels"]');
ok(/Level 1/.test(levels) && /Level 2/.test(levels) && /Level 3/.test(levels) && /Software-Isolated/.test(levels) && /Physically Severed/.test(levels), '4 Level 1/2/3 separation shown');
await shotEl(page, '[data-testid="physical-levels"]', 'assurance_levels.png');
const sel = await page.textContent('[data-testid="physical-level-sel"]');
ok(/no inflation/.test(sel), `no level inflation ("${sel.trim()}")`);

// 5. path inventory (14 paths)
const paths = await page.$$eval('[data-testid="physical-paths"] tr', trs => trs.length);
ok(paths >= 14, `5 path inventory shows ${paths} paths`);
await shotEl(page, '[data-testid="physical-paths"]', 'path_inventory.png');

// 6. relay/power/evidence-channel
const relay = await page.textContent('[data-testid="physical-relay"]');
const channel = await page.textContent('[data-testid="physical-channel"]');
ok(/VERIFIED/.test(relay) && /VERIFIED/.test(channel), '6 relay + one-way evidence channel proofs shown');
await shotEl(page, '[data-testid="physical-relay"]', 'relay_power_evidence_channel.png');
await shotEl(page, '[data-testid="physical-boot"]', 'measured_boot_identity.png');
await shotEl(page, '[data-testid="physical-assumptions"]', 'physical_assumption_register.png');

// 7. capability gate
const cap = await page.textContent('[data-testid="physical-capability"]');
ok(/VERIFIED_HARDWARE_GATED_CAPABILITY/.test(cap), `7 capability gate → ${cap.trim()}`);
await shotEl(page, '[data-testid="physical-capability"]', 'capability_gate.png');

// 8. claim blocker / adversarial matrix
const adv = await page.textContent('[data-testid="physical-adversarial"]');
ok(/ALL FAIL-CLOSED/.test(adv) && /0 not-closed/.test(adv), `8 adversarial matrix all fail-closed ("${adv.trim()}")`);
await shotEl(page, '[data-testid="physical-adversarial"]', 'claim_blocker.png');

// 9/10. blocked gates
const blocked = await page.textContent('[data-testid="physical-blocked"]');
ok(/real hardware BLOCKED/i.test(blocked) && /real provider BLOCKED/i.test(blocked) && /private repo BLOCKED/i.test(blocked) && /Gate 8 BLOCKED/i.test(blocked), '9 blocked: real hardware + provider + private repo + Gate 8');
await shotEl(page, '[data-testid="physical-blocked"]', 'blocked_gates.png');

// no AFFIRMATIVE forbidden claim in panel (the panel may LIST forbidden terms while stating they are blocked).
const panelText = (await page.textContent('#panel-physical')).toLowerCase();
const affirmative = /(is|are)\s+(unhackable|absolutely secure)|escape\s+is\s+impossible|guaranteed containment|proven secure/;
ok(!affirmative.test(panelText) && /blocked/.test(panelText), 'no affirmative forbidden claim asserted (forbidden terms only shown as blocked)');
const danger = await page.$$eval('#panel-physical button, #panel-physical a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|provider key|api key|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/provider-key/external control in panel');

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible physical proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
