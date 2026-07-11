// FounderGate V8-A1 — Truth Dashboard Playwright smoke (FD-IMPLEMENT, founder design v2).
//
// Renders the one-page dashboard at a TRUE 1366×768 and 1440×900 (deviceScaleFactor
// pinned; asserts the reported viewport equals the requested one — Harness-Truth Law
// §27) and locks the founder-design anti-repeats:
//   - identity (project name from project.json) renders
//   - the ALIVE line dot reads HEALTH (green when connected + files present), not run_state
//   - six colour-coded status chips, each role/aria-labelled (the relocated scan surface)
//   - NO accordions (<details> deleted); the honesty SUPERSET is always visible
//   - do-not-touch summary relocated to a footnote that points to the File Cabinet
//   - decision view-only; pause honest scope; no banned words
//
//   PLAYWRIGHT_NODE_MODULES=/abs/node_modules node src/v8a1/dashboard/smoke.mjs

import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createDashboardServer } from "./server.mjs";
import { buildModel } from "../reader.mjs";
import { buildView, REQUIRED_TRANSLATIONS } from "./view-model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");
const OUT = join(REPO, "docs", "assembly-evidence", "B2", "screenshots");
const FIXTURE = resolve(HERE, "..", "fixture", "mock-project");
const PORT = Number(process.env.FG_SMOKE_PORT || 4199);
const VIEWPORTS = [{ width: 1366, height: 768 }, { width: 1440, height: 900 }];

const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js")) : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

mkdirSync(OUT, { recursive: true });
const failures = [];
const must = (cond, msg) => { if (!cond) failures.push(msg); };

const model = buildModel(FIXTURE);
const view = buildView(model);
const browser = await chromium.launch();
try {
  const server = createDashboardServer(FIXTURE);
  await new Promise((r) => server.listen(PORT, r));

  for (const vp of VIEWPORTS) {
    const tag = `${vp.width}x${vp.height}`;
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('body[data-rendered="true"]', { timeout: 5000 });

    // Harness-Truth §27 — the browser actually gave us the viewport we asked for.
    const rv = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio }));
    must(rv.w === vp.width && rv.h === vp.height, `viewport mismatch at ${tag}: got ${rv.w}×${rv.h}`);
    must(rv.dpr === 1, `deviceScaleFactor must be 1 at ${tag}, got ${rv.dpr}`);

    // identity name renders (Law 54 — from project.json)
    const name = await page.$eval("#proj-name", (e) => e.textContent.trim()).catch(() => "");
    must(name === view.home.identity.name && name.length > 0, `project name must render: model="${view.home.identity.name}" shown="${name}"`);

    // ALIVE line — dot reads HEALTH (fixture is healthy → green .ok), not run_state.
    const dotClass = await page.$eval("#alive-dot", (e) => e.className).catch(() => "");
    must(/\bok\b/.test(dotClass), `alive dot must be green (health) on the healthy fixture, got "${dotClass}"`);
    const aliveText = await page.$eval("#alive-text", (e) => e.textContent).catch(() => "");
    must(/healthy|all files in place/i.test(aliveText), `alive line must state health: "${aliveText}"`);

    // six colour-coded, role-labelled status chips (relocated scan-budget surface)
    const chips = await page.$$eval("#chips .chip", (els) => els.map((e) => ({
      answer: e.getAttribute("data-answer"), role: e.getAttribute("role"),
      tone: e.className.replace("chip", "").trim(),
    })));
    must(chips.length === 6, `expected 6 status chips, got ${chips.length} at ${tag}`);
    must(chips.every((c) => c.answer && c.role === "group"), `every chip must be role/answer-labelled at ${tag}`);
    must(new Set(chips.map((c) => c.tone)).size >= 3, `chips must use a spread of colours at ${tag}`);
    const status = chips.find((c) => c.answer === "state"), decision = chips.find((c) => c.answer === "decision");
    must(status && /\bg\b/.test(status.tone), `STATUS chip must be green (health) at ${tag}`);
    must(decision && /\ba\b/.test(decision.tone), `DECISION chip must be amber (attention, not red) at ${tag}`);

    // NO accordions — the honesty superset is always visible (no expand step).
    const detailsCount = await page.$$eval("details", (els) => els.length);
    must(detailsCount === 0, `dashboard must have NO accordions, found ${detailsCount} <details> at ${tag}`);
    const visible = await page.evaluate(() => document.body.innerText);
    for (const t of REQUIRED_TRANSLATIONS) must(visible.includes(t), `honesty superset must be VISIBLE (no expand) — missing "${t}" at ${tag}`);
    const honesty = await page.$eval("#honesty", (e) => e.textContent).catch(() => "");
    must(/doesn't mean the product is finished/i.test(honesty), `green-CI honesty must sit under the chips: "${honesty}"`);

    // DO-NOT-TOUCH relocated — footnote names a protected path AND points to Files.
    const dnt = await page.$eval("#fn-protected", (e) => e.textContent).catch(() => "");
    must(/\.foundergate\/|PANIC_CARD/.test(dnt) && /files/i.test(dnt), `do-not-touch footnote must name a protected path and point to Files: "${dnt}"`);

    // decision view-only; pause honest; tiles link
    const decBtn = await page.$eval("#read-decision", (e) => e.textContent.trim()).catch(() => "");
    must(/read the decision/i.test(decBtn) && !/approve|move forward|confirm|submit/i.test(decBtn), `decision must be view-only: "${decBtn}"`);
    const pauseLabel = await page.$eval("#pause-button", (e) => e.textContent).catch(() => "");
    must(!/pause everything/i.test(pauseLabel), `pause must keep honest scope: "${pauseLabel}"`);
    must(await page.$("#pause-instead"), `the in-card "Pause instead" button must be present`);
    const tiles = await page.$$eval(".tile", (els) => els.map((e) => e.getAttribute("href") || ""));
    must(tiles.length >= 5 && tiles.every((hh) => hh.length), `every quick tile must link, got ${JSON.stringify(tiles)}`);

    // no banned words on screen
    for (const w of ["panic", "fatal", "abort"]) must(!new RegExp(`\\b${w}\\b`).test(visible.toLowerCase()), `banned word "${w}" visible at ${tag}`);

    await page.screenshot({ path: join(OUT, `01-truth-dashboard-${tag}.png`), fullPage: true });
    await page.close();
    console.log(`  captured 01-truth-dashboard-${tag} (true ${tag})`);
  }
  await new Promise((r) => server.close(r));
} finally {
  await browser.close();
}

if (failures.length) { console.error(`\nV8A1-DASHBOARD-SMOKE: FAIL (${failures.length})`); failures.forEach((f) => console.error("  - " + f)); process.exit(1); }
console.log(`\nV8A1-DASHBOARD-SMOKE: PASS`);
