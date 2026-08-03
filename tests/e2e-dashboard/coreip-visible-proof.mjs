// Lane N — VISIBLE / HEADED P0 Core IP proof. Opens a real window; shows Founder Drive Mode, Provider/Repo
// Proof, and the Core IP / Assumption Verification panel. Captures the eight required screenshots. LOCAL only.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4882;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 150 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1450 }, recordVideo: { dir: VID, size: { width: 1400, height: 1450 } } });
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

// 3. Core IP / Assumption Verification
await page.click('[data-testid="nav-coreip"]'); await page.click('[data-testid="coreip-load-btn"]');
await page.waitForFunction(() => /primitives/.test(document.querySelector('[data-testid="coreip-coverage"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'core_ip_panel.png'), fullPage: true });
ok(true, '3 Core IP panel opened');

// 4. assumption counts
const asum = await page.textContent('[data-testid="coreip-assumptions"]');
ok(/10 declared/.test(asum) && /10 verified/.test(asum) && /evidence package generated/.test(asum), `4 assumptions: 10 declared / 10 verified ("${asum.replace(/\s+/g,' ').trim().slice(0,80)}…")`);
await shotEl(page, '[data-testid="coreip-assumptions"]', 'assumption_verification.png');

// 5. environment integrity
const env = await page.textContent('[data-testid="coreip-env"]');
ok(/VERIFIED_LOCAL/.test(env) && /SEALED_LOCAL/.test(env), `5 environment integrity VERIFIED_LOCAL + SEALED ("${env.trim()}")`);
await shotEl(page, '[data-testid="coreip-env"]', 'environment_integrity.png');

// 6. execution integrity
const exe = await page.textContent('[data-testid="coreip-exec"]');
ok(/VERIFIED_LOCAL/.test(exe), `6 execution integrity VERIFIED_LOCAL ("${exe.trim()}")`);
await shotEl(page, '[data-testid="coreip-exec"]', 'execution_integrity.png');

// 7. boundary monitoring
const bd = await page.textContent('[data-testid="coreip-boundary"]');
ok(/CONTINUE/.test(bd) && /0 drift/.test(bd), `7 boundary monitoring stable ("${bd.trim()}")`);
await shotEl(page, '[data-testid="coreip-boundary"]', 'boundary_monitoring.png');

// 8. containment decision
const cn = await page.textContent('[data-testid="coreip-containment"]');
ok(/CONTINUE/.test(cn), `8 containment decision ("${cn.trim()}")`);
await shotEl(page, '[data-testid="coreip-containment"]', 'containment_decision.png');

// 9. evidence confidence (evidence, not AI)
const cf = await page.textContent('[data-testid="coreip-confidence"]');
ok(/HIGH|MEDIUM|LOW|NONE/.test(cf) && /uses AI confidence: NO/.test(cf), `9 evidence confidence (AI confidence NOT used) ("${cf.trim()}")`);
await shotEl(page, '[data-testid="coreip-confidence"]', 'evidence_confidence.png');

// 10. blocked gates
const blocked = await page.textContent('[data-testid="coreip-blocked"]');
ok(/real provider BLOCKED/i.test(blocked) && /private repo BLOCKED/i.test(blocked) && /Gate 8 BLOCKED/i.test(blocked), '10 blocked: real provider + private repo + Gate 8');
await shotEl(page, '[data-testid="coreip-blocked"]', 'blocked_gates.png');

// no danger controls in panel
const danger = await page.$$eval('#panel-coreip button, #panel-coreip a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|contact us|provider key|api key|\bmerge\b|http:\/\/(?!127)|https:\/\//.test(danger), 'no deploy/bill/contact/provider-key/external control in panel');

await page.waitForTimeout(400);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible core-ip proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
