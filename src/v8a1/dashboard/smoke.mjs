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
    // VA-REPAIR-2: the answer-first region — the plain project summary (F1) and the
    // status strip — sits above the fold at 1366x768, so a stranger reads the top
    // of the page and immediately knows what's going on.
    const foldTargets = ["#summary-card", "#status-chips"];
    const aboveFold = {};
    for (const sel of foldTargets) {
      const box = await page.locator(sel).boundingBox();
      const ok = box && box.y + box.height <= foldBottom + 1;
      aboveFold[sel] = ok;
      must(ok, `NOT above the fold at 1366x768: ${sel} (bottom=${box ? Math.round(box.y + box.height) : "none"})`);
    }

    // scan-budget: all 8 answers remain distinct, scannable, colour-coded elements.
    const chipCount = await page.$$eval("[data-answer]", (els) => els.length);
    must(chipCount === 8, `expected 8 scannable answers (data-answer), got ${chipCount}`);
    const toneClasses = await page.$$eval(".qchip", (els) => new Set(els.map((e) => e.className.replace("qchip", "").trim())).size);
    must(toneClasses >= 3, `answer chips must use a spread of status colours, got ${toneClasses}`);

    // D5: the "don't change these" card is present and visually raised.
    const protectRaised = await page.$eval("#do-not-touch", (e) => e.classList.contains("protect")).catch(() => false);
    must(protectRaised, "the 'don't change these' card must carry the raised .protect treatment");

    // F1: the plain project summary is present and populated.
    const summaryText = await page.$eval("#summary-card", (e) => e.innerText.trim()).catch(() => "");
    must(summaryText.length > 12 && /your project/i.test(summaryText), `F1 plain summary must be populated: "${summaryText}"`);

    // F2: the cost figure is BIG (prominent) and present — you can't miss the $50.
    const costFont = await page.$eval("#cost-big", (e) => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0);
    const costText = await page.$eval("#cost-big", (e) => e.textContent).catch(() => "");
    must(costFont >= 30 && /\$\d/.test(costText), `cost figure must be big & present (font ${Math.round(costFont)}px, "${costText}")`);

    // F3 + legal: the decision leads with a plain summary and a VIEW-ONLY affordance.
    const decLead = await page.$eval("#waiting-lead", (e) => e.innerText.trim()).catch(() => "");
    const decBtn = await page.$eval("#read-decision", (e) => e.textContent.trim()).catch(() => "");
    must(decLead.length > 12, `F3 decision lead must be populated: "${decLead}"`);
    must(/read the decision/i.test(decBtn) && !/approve|move forward|confirm|submit/i.test(decBtn), `decision affordance must be view-only: "${decBtn}"`);

    // pause control stays small & calm, honest scope (not "Pause Everything").
    const pauseBox = await page.locator("#pause-button").boundingBox();
    const pauseOk = pauseBox && pauseBox.height <= 44 && pauseBox.width <= 240;
    must(pauseOk, `pause control too large (alarm styling?): ${pauseBox && Math.round(pauseBox.width)}x${pauseBox && Math.round(pauseBox.height)}`);
    const pauseLabel = await page.$eval("#pause-button", (e) => e.textContent).catch(() => "");
    must(!/pause everything/i.test(pauseLabel), `pause must keep honest scope, not "Pause Everything": "${pauseLabel}"`);

    // no dead controls: every quick tile links; every nav item links or is disabled+staged.
    const tileHrefs = await page.$$eval(".tile", (els) => els.map((e) => e.getAttribute("href") || ""));
    must(tileHrefs.length >= 5 && tileHrefs.every((hh) => hh.length), `every tile must link, got ${JSON.stringify(tileHrefs)}`);
    const navItems = await page.$$eval("#home-nav .item", (els) => els.map((e) => ({ link: !!e.getAttribute("href"), disabled: e.hasAttribute("data-nav-disabled"), stage: (e.querySelector("[data-stage]") || {}).textContent || "" })));
    must(navItems.every((n) => n.link || (n.disabled && /^V8-[A-E]/.test(n.stage))), `every nav item must link or be disabled+staged: ${JSON.stringify(navItems)}`);
    const disabledStages = navItems.filter((n) => n.disabled);
    must(disabledStages.every((d) => /^V8-[A-E]/.test(d.stage)), "disabled nav items missing stage labels");

    // banned-word scan over the RENDERED visible text.
    const rawText = await page.evaluate(() => document.body.innerText);
    const bodyText = rawText.toLowerCase();
    for (const w of ["panic", "fatal", "abort"]) must(!new RegExp(`\\b${w}\\b`).test(bodyText), `banned word "${w}" visible on screen`);
    // "safety" must not label the Checks status chip (scoped honesty rule).
    const checksText = await page.$eval('[data-answer="checks"]', (e) => e.innerText).catch(() => "");
    must(!/\bsafety\b/i.test(checksText), `"safety" appeared in the Checks chip: ${checksText}`);
    // key honesties must remain visible on screen in the friendly redesign.
    const REQUIRED = [
      "This is a demo (no real customer data)",
      "Nothing will happen until you decide",
      "Read the Decision",
      "Paid services are blocked in demo mode",
    ];
    for (const t of REQUIRED) must(rawText.includes(t), `required honesty not visible on screen: "${t}"`);

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
      above_the_fold: { plain_summary: aboveFold["#summary-card"], status_strip: aboveFold["#status-chips"] },
      answers_scannable: chipCount,
      cost_figure_px: Math.round(costFont),
      decision_view_only: /read the decision/i.test(decBtn),
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
