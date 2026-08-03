// Showroom / Evidence subsection UI test (assertions + a11y + regression + no-danger/no-overclaim).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const PORT = process.env.OP_PORT || 4880;
const DASH = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const T = (p, s) => p.textContent(s);
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext()).newPage();
await p.setViewportSize({ width: 1360, height: 1500 });
await p.goto(DASH, { waitUntil: 'domcontentloaded' });

await p.click('[data-testid="nav-reviewer"]');
await p.click('[data-testid="reviewer-load-btn"]');
await p.waitForFunction(() => document.querySelectorAll('[data-testid="reviewer-claims"] tr').length >= 5, null, { timeout: 8000 });

// claims summary
const claimRows = await p.$$('[data-testid="reviewer-claims"] tr');
ok(claimRows.length >= 5, `showroom: claims summary >=5 rows (${claimRows.length})`);
const claimsTxt = await T(p, '[data-testid="reviewer-claims"]');
ok(/NOT ALLOWED/.test(claimsTxt) && /ALLOWED/.test(claimsTxt), 'showroom: claims show both ALLOWED and NOT ALLOWED (honest boundaries)');
ok(/Customer proof|paid proof/i.test(claimsTxt) && /NOT ALLOWED/.test(claimsTxt), 'showroom: customer/paid proof marked NOT ALLOWED');
// next protected gate
ok(/Gate 8/.test(await T(p, '[data-testid="reviewer-next-gate"]')), 'showroom: next protected gate is Gate 8');
// evidence index + not-proven still present
ok((await p.$$('[data-testid="reviewer-evidence"] tr')).length >= 5, 'showroom: evidence index >=5 items');
ok(/production readiness/i.test(await T(p, '[data-testid="reviewer-not-proven"]')), 'showroom: what-is-not-proven present');
// Gate 8 blocked note
ok(/Gate 8 and is NOT authorized/i.test(await T(p, '[data-testid="reviewer-gate8"]')), 'showroom: Gate 8 not authorized');

// doc links are LOCAL only (no external), and none is a contact/payment/deploy control
const docHrefs = await p.$$eval('[data-testid="reviewer-docs"] a', els => els.map(e => e.getAttribute('href') || ''));
ok(docHrefs.length >= 6, `showroom: >=6 local document links (${docHrefs.length})`);
ok(docHrefs.every(h => !/^https?:\/\//.test(h) && /docs\/generated\/reviewer_investor_showroom_evidence/.test(h)), 'showroom: all doc links are LOCAL (no external)');
const allControls = await p.$$eval('#panel-reviewer button, #panel-reviewer a', els => els.map(e => (e.textContent || '').toLowerCase() + '|' + (e.getAttribute('href') || '')).join(' '));
ok(!/deploy|billing|payment|checkout|buy now|outreach|send email|contact us|\bmerge\b|pr #200|http:\/\/(?!127)|https:\/\//.test(allControls), 'showroom: no contact/payment/deploy/provider/external control');
// no positive readiness overclaim (strip disclaimers first)
const clean = (await T(p, '#panel-reviewer')).replace(/\bnot\b[^.,;\n]*/gi, ' ').replace(/BLOCKED|NOT READY|NOT STARTED|NOT ALLOWED/gi, ' ');
ok(!/\b(production|saas|customer)[ -]?ready\b|commercially (ready|validated)|security certified/i.test(clean), 'showroom: no positive readiness overclaim');

// regression: Founder Drive Mode still loads + Technical view still exists
await p.click('[data-testid="nav-drive"]'); await p.click('[data-testid="drive-refresh-btn"]');
await p.waitForFunction(() => document.querySelectorAll('[data-testid="drive-cards"] .fg-card').length >= 8, null, { timeout: 8000 });
ok(true, 'regression: Founder Drive Mode still loads');
ok(await p.isVisible('[data-testid="drive-tech-btn"]'), 'regression: Technical view button still present');
await p.click('[data-testid="drive-tech-btn"]');
ok(await p.isVisible('[data-testid="panel-truth"]'), 'regression: Technical view returns to Truth Dashboard');

// a11y on reviewer panel
await p.click('[data-testid="nav-reviewer"]');
await p.addScriptTag({ content: AXE });
const res = await p.evaluate(async () => await window.axe.run(document.querySelector('#panel-reviewer'), { runOnly: ['wcag2a', 'wcag2aa'] }));
const serious = res.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
ok(serious.length === 0, 'a11y: reviewer/showroom 0 serious/critical :: ' + JSON.stringify(serious.map(v => v.id)));

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} showroom UI checks passed.` : `\nRED: ${fail}/${pass + fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
