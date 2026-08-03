// Lane I — VISIBLE / HEADED Assurance Core proof. Opens a real window; shows Founder Drive Mode, Provider/Repo
// Proof, and the Assurance Core panel (P1 coverage, runtime manifest, evidence confidence, scan completeness,
// risk budget, blocked gates). Captures the six required screenshots. LOCAL only.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4881;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 160 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1350 }, recordVideo: { dir: VID, size: { width: 1400, height: 1350 } } });
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

// 3. Assurance Core
await page.click('[data-testid="nav-assurance"]'); await page.click('[data-testid="assurance-load-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="assurance-providers"] tr').length >= 5, null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'assurance_core_panel.png'), fullPage: true });
ok(true, '3 Assurance Core panel opened');

// 4. P1 coverage
const cov = await page.textContent('[data-testid="assurance-coverage"]');
ok(/19 integrated/.test(cov) && /1 planned/.test(cov) && /of 20/.test(cov), `4 P1 coverage shows 19 integrated / 1 planned / of 20 ("${cov.trim()}")`);
await shotEl(page, '[data-testid="assurance-coverage"]', 'p1_coverage.png');

// 5. runtime manifest
const rt = await page.textContent('[data-testid="assurance-runtime"]');
ok(/cfg_/.test(rt) && /rt_/.test(rt) && /DISABLED/.test(rt) && /FG-TM-/.test(rt), '5 runtime manifest shows config+runtime fingerprint, real provider DISABLED, threat model');
await shotEl(page, '[data-testid="assurance-runtime"]', 'runtime_manifest.png');

// 6. evidence confidence
const conf = await page.textContent('[data-testid="assurance-confidence"]');
ok(/HIGH|MEDIUM|LOW|NONE/.test(conf), `6 evidence confidence shown ("${conf.trim()}")`);
await shotEl(page, '[data-testid="assurance-confidence"]', 'evidence_confidence.png');

// 7. scan completeness
const scan = await page.textContent('[data-testid="assurance-scan"]');
ok(/COMPLETE|PARTIAL|UNKNOWN/.test(scan), `7 scan completeness shown ("${scan.trim()}")`);

// 8. risk budget
const rb = await page.textContent('[data-testid="assurance-riskbudget"]');
ok(/WITHIN_BUDGET|EXCEEDED/.test(rb) && /net 0/.test(rb), `8 risk budget shown ("${rb.trim()}")`);
await shotEl(page, '[data-testid="assurance-riskbudget"]', 'risk_budget.png');

// 9. blocked real provider / private repo / Gate 8
const blocked = await page.textContent('[data-testid="assurance-blocked"]');
ok(/real provider BLOCKED/i.test(blocked) && /private repo BLOCKED/i.test(blocked) && /Gate 8 BLOCKED/i.test(blocked), '9 blocked gates: real provider + private repo + Gate 8');
await shotEl(page, '[data-testid="assurance-blocked"]', 'blocked_gates.png');

// provider cannot self-certify + no danger controls
const provTbl = await page.textContent('[data-testid="assurance-providers"]');
ok(!/YES ⚠/.test(provTbl), 'no provider can self-certify (all NO)');
const danger = await page.$$eval('#panel-assurance button, #panel-assurance a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|provider key|api key|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/provider-key/external control in panel');

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible assurance-core proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
