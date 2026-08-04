// W7 — VISIBLE / HEADED Private Repo Least-Privilege Credential Proof. Shows status, private repo identity,
// credential type (READ-ONLY deploy key), intake auth route (deploy-key only), fingerprint, exact commit,
// snapshot digest, secret classifier, write-refusal, credential lifecycle (revocation), evidence replay,
// safety row, blocked gates, next gate. Also proves UNKNOWN-when-source-unavailable and that the required
// label is LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS (never *_SUPPORT_COMPLETE / *_PAT_PROVEN /
// GITHUB_APP_PROVEN / PRODUCTION_READY). LOCAL (reads the sealed evidence index only).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const PORT = process.env.OP_PORT || 4890;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT; const VID = process.env.CV_VID || OUT;
mkdirSync(OUT, { recursive: true }); mkdirSync(VID, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const shotEl = async (pg, sel, name) => { const el = await pg.$(sel); if (el) await el.screenshot({ path: join(OUT, name) }); };

const browser = await chromium.launch({ headless: false, slowMo: 140 });
const context = await browser.newContext({ viewport: { width: 1400, height: 1550 }, recordVideo: { dir: VID, size: { width: 1400, height: 1550 } } });
const page = await context.newPage();
await page.goto(DASH, { waitUntil: 'domcontentloaded' });

await page.click('[data-testid="nav-drive"]'); await page.click('[data-testid="drive-refresh-btn"]');
await page.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, 'Founder Drive Mode opened');

await page.click('[data-testid="nav-leastpriv"]'); await page.click('[data-testid="leastpriv-load-btn"]');
await page.waitForFunction(() => /READY_WITH_LIMITS|PARTIAL/.test(document.querySelector('[data-testid="leastpriv-status"]')?.textContent || ''), null, { timeout: 8000 });
await page.screenshot({ path: join(OUT, 'least_privilege_overview.png'), fullPage: true });
ok(true, 'Private Repo Least-Privilege Credential Proof panel opened');

const status = await page.textContent('[data-testid="leastpriv-status"]');
ok(/LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS/.test(status)
   && !/SUPPORT_COMPLETE/.test(status) && !/PAT_PROVEN/.test(status) && !/GITHUB_APP_PROVEN/.test(status) && !/PRODUCTION_READY/.test(status),
   `status LEAST_PRIVILEGE_DEPLOY_KEY_PROOF_READY_WITH_LIMITS (not SUPPORT_COMPLETE / PAT_PROVEN / GITHUB_APP_PROVEN / PRODUCTION_READY) ("${status.trim()}")`);

const repo = await page.textContent('[data-testid="leastpriv-repo"]');
ok(/foundergate-private-readonly-sandbox/.test(repo) && /private: YES/.test(repo), `private founder-owned sandbox repo ("${repo.trim()}")`);
await shotEl(page, '[data-testid="leastpriv-repo"]', 'repo_identity_commit.png');

const cred = await page.textContent('[data-testid="leastpriv-cred"]');
ok(/READ_ONLY_DEPLOY_KEY/.test(cred) && /read-only: YES/.test(cred), `credential type READ_ONLY_DEPLOY_KEY, read-only YES ("${cred.trim()}")`);
await shotEl(page, '[data-testid="leastpriv-cred"]', 'cred_lifecycle_proof.png');

const route = await page.textContent('[data-testid="leastpriv-route"]');
ok(/ssh_deploy_key_identities_only/.test(route) && /deploy-key-only: YES/.test(route) && /broad-auth key-create-only: YES/.test(route),
   `intake used deploy key ONLY (SSH IdentitiesOnly); broad auth create+delete only ("${route.trim()}")`);

const fingerprint = await page.textContent('[data-testid="leastpriv-fingerprint"]');
ok(/SHA256:/.test(fingerprint), `public deploy key fingerprint shown ("${fingerprint.trim()}")`);

const commit = await page.textContent('[data-testid="leastpriv-commit"]');
ok(/fb54698d5cbb/.test(commit), `exact commit shown ("${commit.trim()}")`);

const secrets = await page.textContent('[data-testid="leastpriv-secrets"]');
ok(/HELD_SENSITIVE_FILES/.test(secrets) && /held/.test(secrets), `secret classifier holds fake secrets ("${secrets.trim()}")`);
await shotEl(page, '[data-testid="leastpriv-secrets"]', 'classifier_held.png');

const refusal = await page.textContent('[data-testid="leastpriv-refusal"]');
ok(/25 cases · all held: YES/.test(refusal), `write-attempt refusal 25/25 ("${refusal.trim()}")`);
await shotEl(page, '[data-testid="leastpriv-refusal"]', 'write_refusal_matrix.png');

const revocation = await page.textContent('[data-testid="leastpriv-revocation"]');
ok(/revoked: YES/.test(revocation) && /post-revocation access denied: YES/.test(revocation) && /private key destroyed: YES/.test(revocation),
   `credential lifecycle: revoked + post-revocation denied + private key destroyed ("${revocation.trim()}")`);
await shotEl(page, '[data-testid="leastpriv-revocation"]', 'revocation_proof.png');

const evidence = await page.textContent('[data-testid="leastpriv-evidence"]');
ok(/REPLAY_VERIFIED/.test(evidence), `evidence replay verified ("${evidence.trim()}")`);
await shotEl(page, '[data-testid="leastpriv-evidence"]', 'evidence_replay.png');

const safety = await page.textContent('[data-testid="leastpriv-safety"]');
ok(/existing\/customer repo: NO/.test(safety) && /credential exposed: NO/.test(safety) && /private key packaged: NO/.test(safety) && /code exec: NO/.test(safety) && /provider: NO/.test(safety),
   'safety row: no existing/customer repo, no credential exposed, no private key packaged, no code exec, no provider');

const blocked = await page.textContent('[data-testid="leastpriv-blocked"]');
ok(/existing repo BLOCKED/i.test(blocked) && /customer repo BLOCKED/i.test(blocked) && /write\/merge BLOCKED/i.test(blocked) && /provider BLOCKED/i.test(blocked) && /PR#200 UNTOUCHED/i.test(blocked) && /protected main UNTOUCHED/i.test(blocked),
   'blocked: existing + customer repo + write/merge + provider; PR#200 + protected main untouched');
await shotEl(page, '[data-testid="leastpriv-blocked"]', 'blocked_customer_repo_gate.png');

// UNKNOWN test
await page.evaluate(() => { window.fetch = () => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) }); });
await page.click('[data-testid="leastpriv-load-btn"]'); await page.waitForTimeout(500);
const afterFail = await page.textContent('[data-testid="leastpriv-status"]');
ok(/UNKNOWN/.test(afterFail), 'missing evidence → UNKNOWN, not green');

// no token/secret/private-key visible; no danger controls
const panelText = await page.textContent('#panel-leastpriv');
ok(!/gh[pousr]_[A-Za-z0-9]{20}/.test(panelText) && !/Bearer [A-Za-z0-9]{20}/.test(panelText) && !/EXAMPLE_PASS/.test(panelText)
   && !/BEGIN [A-Z ]*PRIVATE KEY/.test(panelText), 'no token/bearer/secret sample/private-key material visible in panel');
const danger = await page.$$eval('#panel-leastpriv button, #panel-leastpriv a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|outreach|\bmerge\b|http:\/\/(?!127)|https:\/\/(?!github)/.test(danger), 'no deploy/bill/merge/external-non-github control in panel');

await page.waitForTimeout(300);
await context.close(); await browser.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} visible least-privilege proof checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
