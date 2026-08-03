// Wave 5 E2E: adapter expansion (go/rust runtime-missing, java, monorepo, deps-aware), history &
// ledger export/import (with rejection of unsafe/forbidden/malformed), evidence-viewer compare,
// protected-files policies + export, and a 50-run soak. Real backend; isolated storage.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PORT = process.env.OP_PORT || 4880;
const URL = `http://127.0.0.1:${PORT}/demo/founder_operating_environment/index.html`;
const OUT = process.env.CV_OUT || './screenshots';
const TMP = process.env.W5_TMP || '/tmp/fg-w5';
mkdirSync(OUT, { recursive: true }); mkdirSync(TMP, { recursive: true });
const AXE = readFileSync('./node_modules/axe-core/axe.min.js', 'utf8');

// craft import fixtures
const P = (n,o)=>{ const p=join(TMP,n); writeFileSync(p, JSON.stringify(o)); return p; };
const histValid = P('hist_valid.json', { kind:'foundergate-local-history', local_only:true, runs:[{src:'fixture: node-pass',obj:'x',tests:'PASS',decision:'INTERNAL_DEMO_ONLY',exported:false,status:'PASS'}] });
const histUnsafe = P('hist_unsafe.json', { runs:[{src:'customer/private_data',obj:'x',status:'PASS'}] });
const histBad = P('hist_bad.json', { nope:1 });
const ledValid = P('led_valid.json', { kind:'foundergate-local-ledger', notes:['CONTINUE_DEMO · local internal note · no real-world action'] });
const ledForbidden = P('led_forbidden.json', { notes:['SHIP now to production'] });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('OK   ' + m); } else { fail++; console.log('BAD  ' + m); } };
const b = await chromium.launch({ headless: true });
const npage = async () => { const ctx = await b.newContext({ acceptDownloads:true }); const p = await ctx.newPage(); await p.setViewportSize({ width: 1360, height: 1250 }); return p; };
const shot = (p, n) => p.screenshot({ path: join(OUT, n), fullPage: true });
const T = (p, sel) => p.textContent(sel);
const waitTests = (p) => p.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('[data-testid="chip-tests"]').textContent), null, { timeout: 60000 });
const waitBatch = (p) => p.waitForFunction(() => /never SHIP/.test(document.querySelector('[data-testid="batch-aggregate"]').textContent), null, { timeout: 120000 });

// 1. ADAPTER EXPANSION MATRIX (real, runtime-aware)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-batch"]'); await p.click('[data-testid="batch-run-btn"]'); await waitBatch(p);
  const text = await T(p,'[data-testid="batch-body"]');
  for (const [fx, st] of [['go-style','UNKNOWN_RUNTIME_MISSING'],['rust-style','UNKNOWN_RUNTIME_MISSING'],['java-style','PASS'],['monorepo','FAIL'],['deps-present','PASS'],['deps-missing','HOLD_DEPENDENCIES_NOT_INSTALLED'],['py-deps-missing','HOLD_DEPENDENCIES_NOT_INSTALLED'],['install-requested','REFUSED_NEEDS_AUTHORIZATION'],['unsupported','UNKNOWN']]) {
    ok(text.includes(fx) && text.includes(st), `adapter: ${fx} -> ${st}`);
  }
  await shot(p, 'w5_01_adapter_matrix.png');
  await p.close();
}

// 2. HISTORY export (download) + import valid + reject unsafe/malformed
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.click('[data-testid="nav-history"]');
  const [dl] = await Promise.all([ p.waitForEvent('download'), p.click('[data-testid="hist-export-btn"]') ]);
  ok(/foundergate_history\.json/.test(dl.suggestedFilename()), 'history: export downloads JSON');
  await p.setInputFiles('[data-testid="hist-import-file"]', histValid);
  await p.waitForFunction(() => /IMPORTED/.test(document.querySelector('[data-testid="hist-import-result"]').textContent), null, { timeout: 8000 });
  ok(/IMPORTED/.test(await T(p,'[data-testid="hist-import-result"]')), 'history: import valid accepted');
  await p.setInputFiles('[data-testid="hist-import-file"]', histUnsafe);
  await p.waitForFunction(() => /REJECTED/.test(document.querySelector('[data-testid="hist-import-result"]').textContent), null, { timeout: 8000 });
  ok(/REJECTED/.test(await T(p,'[data-testid="hist-import-result"]')), 'history: import unsafe (customer/private) REJECTED');
  await p.setInputFiles('[data-testid="hist-import-file"]', histBad);
  await p.waitForFunction(() => /REJECTED/.test(document.querySelector('[data-testid="hist-import-result"]').textContent), null, { timeout: 8000 });
  ok(/REJECTED/.test(await T(p,'[data-testid="hist-import-result"]')), 'history: import malformed REJECTED');
  await shot(p, 'w5_02_history_export_import.png');
  await p.close();
}

// 3. LEDGER export + import valid + reject forbidden
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-decisions"]'); await p.click('[data-testid="led-continue"]');
  const [dl] = await Promise.all([ p.waitForEvent('download'), p.click('[data-testid="led-export-btn"]') ]);
  ok(/foundergate_ledger\.json/.test(dl.suggestedFilename()), 'ledger: export downloads JSON');
  await p.setInputFiles('[data-testid="led-import-file"]', ledValid);
  await p.waitForFunction(() => /IMPORTED/.test(document.querySelector('[data-testid="led-import-result"]').textContent), null, { timeout: 8000 });
  ok(/IMPORTED/.test(await T(p,'[data-testid="led-import-result"]')), 'ledger: import valid accepted');
  await p.setInputFiles('[data-testid="led-import-file"]', ledForbidden);
  await p.waitForFunction(() => /REJECTED/.test(document.querySelector('[data-testid="led-import-result"]').textContent), null, { timeout: 8000 });
  ok(/REJECTED/.test(await T(p,'[data-testid="led-import-result"]')), 'ledger: import forbidden (SHIP) REJECTED');
  await p.close();
}

// 4. EVIDENCE VIEWER COMPARE (two local aggregate summaries)
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  // batch A -> export -> load -> capture A
  await p.click('[data-testid="nav-batch"]'); await p.click('[data-testid="batch-run-btn"]'); await waitBatch(p);
  await p.click('[data-testid="batch-export-btn"]');
  await p.waitForFunction(() => /aggregated batch/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  await p.click('[data-testid="nav-viewer"]'); await p.click('[data-testid="viewer-load-btn"]');
  await p.waitForFunction(() => /aggregate/i.test(document.querySelector('[data-testid="viewer-body"]').textContent), null, { timeout: 15000 });
  await p.click('[data-testid="viewer-capA-btn"]');
  // batch B -> export -> load -> capture B
  await p.click('[data-testid="nav-batch"]'); await p.click('[data-testid="batch-run-btn"]'); await waitBatch(p);
  await p.click('[data-testid="batch-export-btn"]');
  await p.waitForFunction(() => /aggregated batch/.test(document.querySelector('[data-testid="evi-state"]').textContent), null, { timeout: 60000 });
  await p.click('[data-testid="nav-viewer"]'); await p.click('[data-testid="viewer-load-btn"]');
  await p.waitForFunction(() => /aggregate/i.test(document.querySelector('[data-testid="viewer-body"]').textContent), null, { timeout: 15000 });
  await p.click('[data-testid="viewer-capB-btn"]');
  await p.click('[data-testid="viewer-compare-btn"]');
  const cmp = await T(p,'[data-testid="viewer-compare"]');
  ok(/zip_verified/.test(cmp) && /(same|DIFF)/.test(cmp), 'viewer: compares two local summaries (fields + same/DIFF)');
  ok(!/[0-9a-f]{40}/.test(cmp), 'viewer: compare shows no full SHA');
  await shot(p, 'w5_03_evidence_compare.png');
  await p.close();
}

// 5. PROTECTED FILES policies + export
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="nav-files"]');
  await p.selectOption('[data-testid="pf-policy"]', 'block-customer');
  await p.fill('[data-testid="pf-input"]', 'customer/orders.csv'); await p.click('[data-testid="pf-check-btn"]');
  ok(/BLOCKED/.test(await T(p,'[data-testid="pf-result"]')) && /block-customer/.test(await T(p,'[data-testid="pf-result"]')), 'pf-policy: block-customer blocks customer/*');
  await p.selectOption('[data-testid="pf-policy"]', 'block-production');
  await p.fill('[data-testid="pf-input"]', 'customer/orders.csv'); await p.click('[data-testid="pf-check-btn"]');
  ok(!/BLOCKED/.test(await T(p,'[data-testid="pf-result"]')), 'pf-policy: block-production does not block customer/* (policy scoping)');
  const [dl] = await Promise.all([ p.waitForEvent('download'), p.click('[data-testid="pf-export-btn"]') ]);
  ok(/protected_files_report\.json/.test(dl.suggestedFilename()), 'pf: export classification report downloads JSON');
  await shot(p, 'w5_04_pf_policies.png');
  await p.close();
}

// 6. LONG SOAK: 50 governed runs
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  let green = 0;
  for (let i = 0; i < 50; i++) { await p.click('[data-testid="run-btn"]'); await waitTests(p); if (/30\/30/.test(await T(p,'[data-testid="chip-tests"]'))) green++; }
  ok(green === 50, `soak: 50/50 governed runs honest 30/30 (got ${green})`);
  await p.reload({ waitUntil: 'domcontentloaded' });
  ok(/UNKNOWN/.test(await T(p,'[data-testid="chip-tests"]')), 'soak: reload -> UNKNOWN (no stale green)');
  await p.close();
}

// 7. accessibility across all panels
{
  const p = await npage(); await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.click('[data-testid="run-btn"]'); await waitTests(p);
  await p.addScriptTag({ content: AXE });
  let serious = 0; const ids = new Set();
  for (const n of ['truth','preview','batch','evidence','viewer','history','decisions','guide','files','tech']) {
    await p.click(`[data-testid="nav-${n}"]`);
    const res = await p.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a','wcag2aa'] }));
    for (const v of res.violations) if (v.impact==='serious'||v.impact==='critical'){ serious += v.nodes.length; ids.add(v.id); }
  }
  ok(serious === 0, 'a11y: axe 0 serious/critical across all panels :: ' + JSON.stringify([...ids]));
  await p.close();
}

await b.close();
console.log(fail === 0 ? `\nALL GREEN: ${pass}/${pass} wave5 generalization checks passed.` : `\nRED: ${fail}/${pass+fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
