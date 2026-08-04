// B6 — VISIBLE / HEADED Private Repo Credential Route Matrix proof. Shows the one PROVEN_WITH_LIMITS route
// (deploy key), the PLANNED/BLOCKED routes, the FUTURE route, the two TRUE_FOUNDER_GATE routes, policy
// invariants, the 20/20 negative matrix, and UNKNOWN-when-source-missing. Asserts NO route other than the
// deploy key reads as proven, and no forbidden program claim appears. LOCAL (reads the matrix index only).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4891;
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

await page.click('[data-testid="nav-credroute"]'); await page.click('[data-testid="credroute-load-btn"]');
await page.waitForFunction(() => /READY_WITH_LIMITS|UNKNOWN/.test(document.querySelector('[data-testid="credroute-status"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'credential_route_matrix_overview.png'), fullPage: true });
ok(true, 'Credential Route Matrix panel opened');

const status = await page.textContent('[data-testid="credroute-status"]');
ok(/CREDENTIAL_ROUTE_MATRIX_READY_WITH_LIMITS/.test(status), `status READY_WITH_LIMITS ("${status.trim()}")`);

const proven = await page.textContent('[data-testid="credroute-proven"]');
ok(/deploy_key/.test(proven) && !/pat|app|customer|existing/i.test(proven), `only deploy_key proven-with-limits ("${proven.trim()}")`);
await shotEl(page, '[data-testid="credroute-proven"]', 'proven_route_deploy_key.png');

const invariants = await page.textContent('[data-testid="credroute-invariants"]');
ok(/YES/.test(invariants), 'policy invariants hold: YES');

const negative = await page.textContent('[data-testid="credroute-negative"]');
ok(/20 cases · all held: YES/.test(negative), `negative matrix 20/20 held ("${negative.trim()}")`);
await shotEl(page, '[data-testid="credroute-negative"]', 'negative_refusal_matrix.png');

const rows = await page.textContent('[data-testid="credroute-rows"]');
ok(/PROVEN_WITH_LIMITS/.test(rows) && /PLANNED_BLOCKED/.test(rows) && /FUTURE_BLOCKED/.test(rows) && /TRUE_FOUNDER_GATE/.test(rows), 'rows show PROVEN_WITH_LIMITS + PLANNED_BLOCKED + FUTURE_BLOCKED + TRUE_FOUNDER_GATE');
// fine-grained PAT and GitHub App must NOT read as proven
ok(!/Fine-grained[^]*?PROVEN_WITH_LIMITS/.test(rows) && !/GitHub App[^]*?PROVEN_WITH_LIMITS/.test(rows), 'fine-grained PAT and GitHub App are NOT marked proven');
await shotEl(page, '[data-testid="credroute-rows"]', 'route_rows.png');

const next = await page.textContent('[data-testid="credroute-next"]');
ok(/fine_grained_pat/.test(next), `recommended next gate = fine_grained_pat ("${next.trim()}")`);

const blocked = await page.textContent('[data-testid="credroute-blocked"]');
ok(/existing founder repo TRUE_FOUNDER_GATE/.test(blocked) && /customer repo TRUE_FOUNDER_GATE/.test(blocked) && /write\/merge BLOCKED/.test(blocked) && /PR#200 UNTOUCHED/.test(blocked) && /protected main UNTOUCHED/.test(blocked), 'blocked: existing+customer repo true gates; write/merge blocked; PR#200 + main untouched');
await shotEl(page, '[data-testid="credroute-blocked"]', 'blocked_true_founder_gates.png');

// UNKNOWN test
await page.evaluate(() => { window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); });
await page.click('[data-testid="credroute-load-btn"]'); await page.waitForTimeout(500);
const afterFail = await page.textContent('[data-testid="credroute-status"]');
ok(/UNKNOWN/.test(afterFail), 'missing evidence → UNKNOWN, not green');

// no forbidden program claim / token / danger control in the panel
// A forbidden term is only a violation if it appears in a clause WITHOUT a same-clause negation.
const panelText = await page.textContent('#panel-credroute');
const clauses = panelText.split(/[.·\n]/);
const affirmingOverclaim = clauses.some(cl => /support[- ]complete|production[- ]?ready|SaaS ready|customer[- ]repo support/i.test(cl) && !/\bnot\b|\bnever\b|blocked|does not/i.test(cl));
ok(!affirmingOverclaim, 'no affirmed support-complete / production-ready claim (only negated disclaimers present)');
ok(!/gh[pousr]_[A-Za-z0-9]{20}/.test(panelText) && !/BEGIN [A-Z ]*PRIVATE KEY/.test(panelText), 'no token / private-key material in panel');
const danger = await page.$$eval('#panel-credroute button, #panel-credroute a', els => els.map(e => (e.textContent||'').toLowerCase()+'|'+(e.getAttribute('href')||'')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|\bmerge\b|http:\/\/(?!127)|https:\/\/(?!github)/.test(danger), 'no deploy/bill/merge/external control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible credential-route-matrix checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
