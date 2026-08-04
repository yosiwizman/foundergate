// W8 — VISIBLE / HEADED Fine-Grained PAT Proof. When no safe Keychain PAT exists, the panel must show the
// honest TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED state (NOT green), token-never-exposed, 30/30 refusals,
// replay verified (gate-required), and UNKNOWN when the source is missing. Must NOT show any *_SUPPORT_COMPLETE /
// GITHUB_APP_PROVEN / PRODUCTION_READY / SECURITY_CERTIFIED / MERGE_READY label. LOCAL (reads the index only).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4892;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 130 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1650 }, recordVideo: { dir: VID, size: { width: 1400, height: 1650 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

await page.click('[data-testid="nav-fgpat"]'); await page.click('[data-testid="fgpat-load-btn"]');
await page.waitForFunction(() => /TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED|PROOF_READY_WITH_LIMITS|INTAKE_PROVEN|UNKNOWN/.test(document.querySelector('[data-testid="fgpat-status"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'pat_overview.png'), fullPage: true });
ok(true, 'Fine-Grained PAT Proof panel opened');

const status = await page.textContent('[data-testid="fgpat-status"]');
ok(/TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED/.test(status), `status TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED (honest gate, not green) ("${status.trim()}")`);
ok(!/SUPPORT_COMPLETE|GITHUB_APP_PROVEN|PRODUCTION_READY|SECURITY_CERTIFIED|MERGE_READY/.test(status), 'no forbidden label in status');

const keychain = await page.textContent('[data-testid="fgpat-keychain"]');
ok(/NO \(token needed\)/.test(keychain), `Keychain PAT present: NO (token needed) ("${keychain.trim()}")`);
await shotEl(page, '[data-testid="fgpat-keychain"]', 'keychain_status.png');

const tokensafe = await page.textContent('[data-testid="fgpat-tokensafe"]');
ok(/exposed: NO/.test(tokensafe) && /packaged: NO/.test(tokensafe), 'token value exposed: NO · packaged: NO');

const scope = await page.textContent('[data-testid="fgpat-scope"]');
ok(/TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED/.test(scope), `scope validation = gate required ("${scope.trim()}")`);
await shotEl(page, '[data-testid="fgpat-scope"]', 'scope_validation.png');

const route = await page.textContent('[data-testid="fgpat-route"]');
ok(/broad-auth: NO/.test(route) && /deploy-key: NO/.test(route), 'intake route: no broad-auth, no deploy-key');

const repo = await page.textContent('[data-testid="fgpat-repo"]');
ok(/foundergate-private-readonly-sandbox/.test(repo) && /private: YES/.test(repo), `sandbox repo private ("${repo.trim()}")`);
await shotEl(page, '[data-testid="fgpat-repo"]', 'repo_identity_commit.png');

const refusal = await page.textContent('[data-testid="fgpat-refusal"]');
ok(/30 cases · all held: YES/.test(refusal), `write-attempt refusal 30/30 ("${refusal.trim()}")`);
await shotEl(page, '[data-testid="fgpat-refusal"]', 'write_refusal_matrix.png');

const revocation = await page.textContent('[data-testid="fgpat-revocation"]');
ok(/TRUE_FOUNDER_GATE_PAT_CREATION_REQUIRED/.test(revocation), `revocation/expiry honest (gate required) ("${revocation.trim()}")`);
await shotEl(page, '[data-testid="fgpat-revocation"]', 'revocation_or_expiry.png');

const evidence = await page.textContent('[data-testid="fgpat-evidence"]');
ok(/REPLAY_VERIFIED_GATE_REQUIRED/.test(evidence), `evidence replay verified (gate-required path) ("${evidence.trim()}")`);
await shotEl(page, '[data-testid="fgpat-evidence"]', 'evidence_replay.png');

const safety = await page.textContent('[data-testid="fgpat-safety"]');
ok(/existing\/customer repo: NO/.test(safety) && /code exec: NO/.test(safety) && /provider: NO/.test(safety), 'safety row: no existing/customer repo, no code exec, no provider');

const blocked = await page.textContent('[data-testid="fgpat-blocked"]');
ok(/existing repo BLOCKED/.test(blocked) && /customer repo BLOCKED/.test(blocked) && /github app BLOCKED/.test(blocked) && /PR#200 UNTOUCHED/.test(blocked) && /protected main UNTOUCHED/.test(blocked), 'blocked: existing+customer repo+github app; PR#200 + main untouched');
await shotEl(page, '[data-testid="fgpat-blocked"]', 'blocked_customer_repo_gate.png');

// UNKNOWN test
await page.evaluate(() => { window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); });
await page.click('[data-testid="fgpat-load-btn"]'); await page.waitForTimeout(500);
const afterFail = await page.textContent('[data-testid="fgpat-status"]');
ok(/UNKNOWN/.test(afterFail), 'missing evidence → UNKNOWN, not green');

// no token/secret/private-key visible in panel
const panelText = await page.textContent('#panel-fgpat');
ok(!/github_pat_[A-Za-z0-9_]{20}/.test(panelText) && !/gh[pousr]_[A-Za-z0-9]{20}/.test(panelText) && !/Bearer [A-Za-z0-9]{20}/.test(panelText), 'no token/bearer value visible in panel');
const danger = await page.$$eval('#panel-fgpat button, #panel-fgpat a', els => els.map(e => (e.textContent||'').toLowerCase()+'|'+(e.getAttribute('href')||'')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|\bmerge\b|http:\/\/(?!127)|https:\/\/(?!github)/.test(danger), 'no deploy/bill/merge/external control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible fine-grained-PAT proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
