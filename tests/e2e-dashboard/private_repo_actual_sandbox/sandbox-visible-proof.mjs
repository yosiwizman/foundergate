// W5 — VISIBLE / HEADED Private Repo Actual Sandbox Proof. Shows status, private repo identity, exact commit,
// snapshot digest, secret classifier, write-refusal, evidence replay, safety row, blocked gates, next gate.
// Also proves UNKNOWN-when-source-unavailable. LOCAL (reads the sealed evidence index only).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4889;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 140 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1450 }, recordVideo: { dir: VID, size: { width: 1400, height: 1450 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, 'Founder Drive Mode opened');

await page.click('[data-testid="nav-sandbox"]'); await page.click('[data-testid="sandbox-load-btn"]');
await page.waitForFunction(() => /READY_WITH_LIMITS|PARTIAL/.test(document.querySelector('[data-testid="sandbox-status"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'private_sandbox_overview.png'), fullPage: true });
ok(true, 'Private Sandbox Proof panel opened');

const status = await page.textContent('[data-testid="sandbox-status"]');
ok(/ACTUAL_PRIVATE_SANDBOX_REPO_PROOF_READY_WITH_LIMITS/.test(status) && !/SUPPORT_COMPLETE/.test(status), `status READY_WITH_LIMITS (not SUPPORT_COMPLETE) ("${status.trim()}")`);

const repo = await page.textContent('[data-testid="sandbox-repo"]');
ok(/foundergate-private-readonly-sandbox/.test(repo) && /private: YES/.test(repo), `private founder-owned sandbox repo ("${repo.trim()}")`);
await shotEl(page, '[data-testid="sandbox-repo"]', 'repo_identity_commit.png');

const commit = await page.textContent('[data-testid="sandbox-commit"]');
ok(/fb54698d5cbb/.test(commit), `exact commit shown ("${commit.trim()}")`);

const secrets = await page.textContent('[data-testid="sandbox-secrets"]');
ok(/HELD_SENSITIVE_FILES/.test(secrets) && /held/.test(secrets), `secret classifier holds fake secrets ("${secrets.trim()}")`);
await shotEl(page, '[data-testid="sandbox-secrets"]', 'secret_classifier.png');

const refusal = await page.textContent('[data-testid="sandbox-refusal"]');
ok(/25 cases · all held: YES/.test(refusal), `write-attempt refusal 25/25 ("${refusal.trim()}")`);
await shotEl(page, '[data-testid="sandbox-refusal"]', 'write_refusal_matrix.png');

const evidence = await page.textContent('[data-testid="sandbox-evidence"]');
ok(/REPLAY_VERIFIED/.test(evidence), `evidence replay verified ("${evidence.trim()}")`);
await shotEl(page, '[data-testid="sandbox-evidence"]', 'evidence_replay.png');

const accessed = await page.textContent('[data-testid="sandbox-accessed"]');
ok(/YES/.test(accessed) && /sandbox/.test(accessed), 'actual private repo accessed: YES (founder-owned sandbox)');
const safety = await page.textContent('[data-testid="sandbox-safety"]');
ok(/existing\/customer repo: NO/.test(safety) && /credential exposed: NO/.test(safety) && /code exec: NO/.test(safety) && /provider: NO/.test(safety), 'safety row: no existing/customer repo, no credential exposed, no code exec, no provider');

const blocked = await page.textContent('[data-testid="sandbox-blocked"]');
ok(/existing repo BLOCKED/i.test(blocked) && /customer repo BLOCKED/i.test(blocked) && /write\/merge BLOCKED/i.test(blocked) && /PR#200 UNTOUCHED/i.test(blocked), 'blocked: existing + customer repo + write/merge; PR#200 untouched');
await shotEl(page, '[data-testid="sandbox-blocked"]', 'blocked_customer_repo_gate.png');

// UNKNOWN test
await page.evaluate(() => { window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); });
await page.click('[data-testid="sandbox-load-btn"]'); await page.waitForTimeout(500);
const afterFail = await page.textContent('[data-testid="sandbox-status"]');
ok(/UNKNOWN/.test(afterFail), 'missing evidence → UNKNOWN, not green');

// no token/secret visible; no danger controls
const panelText = await page.textContent('#panel-sandbox');
ok(!/gh[pousr]_[A-Za-z0-9]{20}/.test(panelText) && !/Bearer [A-Za-z0-9]{20}/.test(panelText) && !/EXAMPLE_PASS/.test(panelText), 'no token/bearer/secret sample visible in panel');
const danger = await page.$$eval('#panel-sandbox button, #panel-sandbox a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|\bmerge\b|http:\/\/(?!127)|https:\/\/(?!github)/.test(danger), 'no deploy/bill/merge/external-non-github control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible sandbox proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
