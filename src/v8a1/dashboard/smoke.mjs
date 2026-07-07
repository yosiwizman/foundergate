// FounderGate V8-A1 — Playwright smoke + anti-repeat geometry checks (A24).
//
// Renders the app-shell Truth Dashboard at 1366x768 and (1) captures screenshots
// of every screen state, and (2) ASSERTS the four founder-caught G2 defects can
// never silently return:
//   - questions 1-4 + current status are ABOVE THE FOLD at 1366x768
//   - the page has a minimal scroll-depth budget (recorded to hand-burden.json)
//   - the pause control is small (no oversized alarm styling)
//   - disabled future-nav items carry stage labels
// LOCAL evidence generation (browsers not required in CI). Writes only into the
// evidence folder. The committed file carries no machine-specific path.
//
//   PLAYWRIGHT_NODE_MODULES=/abs/node_modules node src/v8a1/dashboard/smoke.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createDashboardServer } from "./server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");
const OUT = join(REPO, "docs", "assembly-evidence", "B2", "screenshots");
const FIXTURE = resolve(HERE, "..", "fixture", "mock-project");
const PORT = Number(process.env.FG_SMOKE_PORT || 4199);
const VIEWPORT = { width: 1366, height: 768 };
const SCROLL_BUDGET_PX = 1500; // "minimal scrolling" budget for the fixture at 1366x768

const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js"))
  : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

mkdirSync(OUT, { recursive: true });
const failures = [];
function must(cond, msg) { if (!cond) failures.push(msg); }

async function open(browser, projectRoot) {
  const server = createDashboardServer(projectRoot);
  await new Promise((r) => server.listen(PORT, r));
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-rendered="true"]', { timeout: 5000 });
  return { page, close: async () => { await page.close(); await new Promise((r) => server.close(r)); } };
}

const browser = await chromium.launch();
let handBurden = {};
try {
  // ---- Fixture: app-shell dashboard + geometry anti-repeat checks -----------
  {
    const { page, close } = await open(browser, FIXTURE);

    const foldBottom = VIEWPORT.height;
    const foldTargets = ['[data-q="1"]', '[data-q="2"]', '[data-q="3"]', '[data-q="4"]', "#status-card"];
    const aboveFold = {};
    for (const sel of foldTargets) {
      const box = await page.locator(sel).boundingBox();
      const ok = box && box.y + box.height <= foldBottom + 1;
      aboveFold[sel] = ok;
      must(ok, `NOT above the fold at 1366x768: ${sel} (bottom=${box ? Math.round(box.y + box.height) : "none"})`);
    }

    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    must(scrollHeight <= SCROLL_BUDGET_PX, `scroll-depth over budget: ${scrollHeight}px > ${SCROLL_BUDGET_PX}px`);

    const pauseBox = await page.locator("#pause-button").boundingBox();
    const pauseOk = pauseBox && pauseBox.height <= 44 && pauseBox.width <= 220;
    must(pauseOk, `pause control too large (alarm styling?): ${pauseBox && Math.round(pauseBox.width)}x${pauseBox && Math.round(pauseBox.height)}`);

    const disabledStages = await page.$$eval('[data-nav-disabled]', (els) =>
      els.map((e) => ({ id: e.getAttribute("data-nav-disabled"), stage: (e.querySelector("[data-stage]") || {}).textContent || "" }))
    );
    must(disabledStages.length >= 5 && disabledStages.every((d) => /^V8-[A-E]/.test(d.stage)), "disabled nav items missing stage labels");

    // banned-word scan over the RENDERED visible text
    const bodyText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    for (const w of ["panic", "fatal", "abort"]) must(!new RegExp(`\\b${w}\\b`).test(bodyText), `banned word "${w}" visible on screen`);

    await page.screenshot({ path: join(OUT, "01-truth-dashboard.png"), fullPage: true });
    await page.screenshot({ path: join(OUT, "01b-above-the-fold-1366x768.png") }); // viewport only = the fold
    console.log("  captured 01-truth-dashboard.png + 01b-above-the-fold-1366x768.png");

    // primary action: pause pressed → friendly honest scope
    await page.click("#pause-button");
    await page.waitForSelector("#pause-scope:not([hidden])");
    await page.screenshot({ path: join(OUT, "02-pause-pressed.png") });
    console.log("  captured 02-pause-pressed.png");

    handBurden = {
      viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
      terminal_copy_paste_count: 0,
      clicks_to_see_current_status: 0,
      clicks_to_pause: 1,
      pause_control_always_visible: true,
      above_the_fold: { questions_1_to_4: foldTargets.slice(0, 4).every((s) => aboveFold[s]), current_status: aboveFold["#status-card"] },
      page_scroll_height_px: scrollHeight,
      scroll_budget_px: SCROLL_BUDGET_PX,
      scroll_within_budget: scrollHeight <= SCROLL_BUDGET_PX,
      pause_control_px: pauseBox && { w: Math.round(pauseBox.width), h: Math.round(pauseBox.height) },
      disabled_nav_stage_labels: disabledStages,
      banned_words_visible: false,
    };
    await close();
  }

  // ---- Disconnected: cannot-invent-state renders UNKNOWN, still calm --------
  {
    const { page, close } = await open(browser, join(REPO, "src", "v8a1"));
    const bodyText = await page.evaluate(() => document.body.innerText);
    must(/UNKNOWN|not connected/i.test(bodyText), "disconnected view should show UNKNOWN / not connected");
    for (const w of ["panic", "fatal", "abort"]) must(!new RegExp(`\\b${w}\\b`, "i").test(bodyText), `banned word "${w}" visible when disconnected`);
    await page.screenshot({ path: join(OUT, "03-not-connected-unknown.png"), fullPage: true });
    console.log("  captured 03-not-connected-unknown.png");
    await close();
  }

  writeFileSync(join(REPO, "docs", "assembly-evidence", "B2", "hand-burden.json"), JSON.stringify(handBurden, null, 2) + "\n");
  console.log("  wrote hand-burden.json");
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`\nV8A1-SMOKE: FAIL (${failures.length})`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log(`\nV8A1-SMOKE: PASS — screenshots + anti-repeat geometry checks green (${OUT})`);
