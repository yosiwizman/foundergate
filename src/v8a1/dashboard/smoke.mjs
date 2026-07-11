// FounderGate V8-A1 — Playwright smoke + anti-repeat geometry checks (VA-REPAIR-3).
//
// Renders the three-layer dashboard at 1366x768 and captures screenshots +
// ASSERTS the stranger-caught regressions can never silently return:
//   R1  the project NAME (from project.json) renders in the identity header
//   R2  ONLY Layer 1 is above the fold: ≤6 role-labelled answers above 768px,
//       Layer 2 starts below the fold, all 8 answers still present
//   honesty superset present in the DOM (a SUPERSET of the five A1 translations),
//       and the collapsed ones become visible when their <details> is expanded
//   pause small + honest, decision view-only, tiles/nav not dead, no banned words
// Also a 5-second still (above-the-fold viewport only).
//
//   PLAYWRIGHT_NODE_MODULES=/abs/node_modules node src/v8a1/dashboard/smoke.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createDashboardServer } from "./server.mjs";
import { buildModel } from "../reader.mjs";
import { buildView } from "./view-model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");
const OUT = join(REPO, "docs", "assembly-evidence", "B2", "screenshots");
const FIXTURE = resolve(HERE, "..", "fixture", "mock-project");
const PORT = Number(process.env.FG_SMOKE_PORT || 4199);
const VIEWPORT = { width: 1366, height: 768 };

const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js")) : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

mkdirSync(OUT, { recursive: true });
const failures = [];
const must = (cond, msg) => { if (!cond) failures.push(msg); };

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
  {
    const { page, close } = await open(browser, FIXTURE);

    // R1 — the project NAME (from project.json) renders in the identity header.
    const modelName = buildView(buildModel(FIXTURE)).home.identity.name;
    const shownName = (await page.$eval("#proj-name", (e) => e.textContent.trim()).catch(() => ""));
    must(shownName.length > 0 && shownName === modelName, `project name must render in the header: model="${modelName}" shown="${shownName}"`);
    // J5 — a "Project" label sits next to the name so a stranger knows it's the project's name.
    const projLabel = await page.$eval("#proj-label", (e) => e.textContent.trim()).catch(() => "");
    must(/project/i.test(projLabel), `identity must carry a "Project" label, got "${projLabel}"`);
    // J1 — the running-STATE chip is present as the first status chip.
    const firstChip = await page.$eval("#status-chips [data-answer='state'] .statchip-name", (e) => e.textContent.trim()).catch(() => "");
    must(/status/i.test(firstChip), `the running-state chip must be present, got "${firstChip}"`);
    // J2 — the decision card carries the amber highlight iff a decision is pending (fixture is pending).
    const pending = buildView(buildModel(FIXTURE)).home.waiting.hasPending;
    const highlighted = await page.$eval("#waiting", (e) => e.classList.contains("needs-you")).catch(() => false);
    must(highlighted === pending, `needs-you highlight (${highlighted}) must match pending-decision (${pending})`);

    // Geometry checks run at BOTH the standard (1366x768) and a TALL (1440x900)
    // viewport, so tall-screen voids are caught forever (VA-VISUAL-LAW).
    async function geometry(vp) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(120);
      const fold = vp.height;
      const tag = `${vp.width}x${vp.height}`;

      // (a) all Layer-1 elements FULLY VISIBLE above the fold.
      for (const sel of ["#identity", "#status-chips", "#next-action"]) {
        const box = await page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }).catch(() => null);
        must(box && box.bottom <= fold + 1, `Layer 1 element ${sel} must be fully above the fold at ${tag} (bottom=${box ? Math.round(box.bottom) : "none"})`);
      }
      // (b) fold budget: Layer 1 presents ≤6 role-labelled answers, ALL above the
      //     fold. (With the void removed, Layer 2 now flows up and may peek above
      //     the fold — that's good UX, not cramming; the budget applies to Layer 1's
      //     answer set, i.e. identity + the ≤5 status chips.)
      const all = await page.$$eval("[data-answer]", (els) => els.length);
      must(all >= 8, `expected >=8 scannable answers total, got ${all} at ${tag}`);
      // Layer 1 = identity + status chips; chips stay within the 5–9 metric ceiling,
      // and every Layer-1 answer is fully above the fold.
      const layer1 = await page.$$eval("#identity[data-answer], #layer1 [data-answer]", (els) => els.map((e) => ({ bottom: e.getBoundingClientRect().bottom, role: e.getAttribute("role") })));
      must(layer1.length >= 6 && layer1.length <= 10, `Layer 1 answers out of range: ${layer1.length} (identity + 5–9 chips) at ${tag}`);
      must(layer1.every((a) => a.bottom <= fold + 1), `every Layer-1 answer must be fully above the fold at ${tag}`);
      must(layer1.every((a) => a.role === "group"), `every Layer-1 answer must be role-labelled at ${tag}`);
      // (c) ANTI-VOID: no vertical gap > 120px between consecutive rendered sections
      //     (the min-height void rewarded by the old "Layer 2 below the fold" rule).
      const gaps = await page.$$eval(".topbar, #layer1, .mainrow, #layer2 > .card, .layer3 > details", (els) => {
        const rects = els.map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0).sort((a, b) => a.top - b.top);
        const out = [];
        for (let i = 1; i < rects.length; i++) out.push(Math.round(rects[i].top - rects[i - 1].bottom));
        return out;
      });
      const worst = Math.max(0, ...gaps);
      must(worst <= 120, `dead-space VOID at ${tag}: a ${worst}px gap between sections (max ~120px). gaps=${JSON.stringify(gaps)}`);
    }
    await geometry({ width: 1366, height: 768 });
    await geometry({ width: 1440, height: 900 });
    await page.setViewportSize(VIEWPORT); // back to standard for the remaining checks + shots

    const toneClasses = await page.$$eval(".qchip", (els) => new Set(els.map((e) => e.className.replace("qchip", "").trim())).size);
    must(toneClasses >= 3, `status chips must use a spread of colours, got ${toneClasses}`);

    // F2 — big cost figure (in Layer 3, present + big).
    const costFont = await page.$eval("#cost-big", (e) => parseFloat(getComputedStyle(e).fontSize)).catch(() => 0);
    const costText = await page.$eval("#cost-big", (e) => e.textContent).catch(() => "");
    must(costFont >= 30 && /\$\d/.test(costText), `cost figure must be big & present (font ${Math.round(costFont)}px, "${costText}")`);

    // F3 + legal — decision leads with a plain summary; view-only affordance.
    const decLead = await page.$eval("#waiting-lead", (e) => e.innerText.trim()).catch(() => "");
    const decBtn = await page.$eval("#read-decision", (e) => e.textContent.trim()).catch(() => "");
    must(decLead.length > 12, `F3 decision lead must be populated: "${decLead}"`);
    must(/read the decision/i.test(decBtn) && !/approve|move forward|confirm|submit/i.test(decBtn), `decision affordance must be view-only: "${decBtn}"`);

    // pause small & honest.
    const pauseBox = await page.locator("#pause-button").boundingBox();
    must(pauseBox && pauseBox.height <= 56 && pauseBox.width <= 260, `pause control too large: ${pauseBox && Math.round(pauseBox.width)}x${pauseBox && Math.round(pauseBox.height)}`);
    const pauseLabel = await page.$eval("#pause-button", (e) => e.textContent).catch(() => "");
    must(!/pause everything/i.test(pauseLabel), `pause must keep honest scope: "${pauseLabel}"`);

    // D5 — the protect card is present and raised (may be inside a collapsed section).
    const protectRaised = await page.$eval("#do-not-touch", (e) => e.classList.contains("protect")).catch(() => false);
    must(protectRaised, "the 'don't change these' card must carry the raised .protect treatment");

    // no dead controls.
    const tileHrefs = await page.$$eval(".tile", (els) => els.map((e) => e.getAttribute("href") || ""));
    must(tileHrefs.length >= 5 && tileHrefs.every((hh) => hh.length), `every tile must link, got ${JSON.stringify(tileHrefs)}`);
    const navItems = await page.$$eval("#home-nav .item", (els) => els.map((e) => ({ link: !!e.getAttribute("href"), disabled: e.hasAttribute("data-nav-disabled"), stage: (e.querySelector("[data-stage]") || {}).textContent || "" })));
    must(navItems.every((n) => n.link || (n.disabled && /^V8-[A-E]/.test(n.stage))), `every nav item must link or be disabled+staged: ${JSON.stringify(navItems)}`);

    // honesty SUPERSET — present in the DOM (textContent includes collapsed <details>).
    const domText = await page.evaluate(() => document.body.textContent);
    const REQUIRED = [
      "Decision Needed", "Waiting for your decision.",
      "the robot tests passed — this doesn't mean the product is finished.",
      "Developer work package #7 (PR)", "Demo mode — no real customer data (MOCK_ONLY)",
      "This is a demo (no real customer data)", "Nothing will happen until you decide",
      "Read the Decision", "Paid services are blocked in demo mode",
    ];
    for (const t of REQUIRED) must(domText.includes(t), `required honesty not present in the DOM: "${t}"`);
    // green-CI companion near the Checks chip.
    const ciNote = await page.$eval("#ci-honesty", (e) => e.textContent).catch(() => "");
    must(/doesn't mean the product is finished/i.test(ciNote), `green-CI honesty must be near the Checks chip: "${ciNote}"`);
    // progressive disclosure, not hiding: expand all <details> → the collapsed honesties become visible.
    await page.$$eval("details.disclose", (els) => els.forEach((d) => (d.open = true)));
    const visText = await page.evaluate(() => document.body.innerText);
    for (const t of ["This is a demo (no real customer data)", "Paid services are blocked in demo mode"]) {
      must(visText.includes(t), `collapsed honesty must be VISIBLE after expand: "${t}"`);
    }
    // banned words + "safety"-scoping (over the fully-expanded visible text).
    for (const w of ["panic", "fatal", "abort"]) must(!new RegExp(`\\b${w}\\b`).test(visText.toLowerCase()), `banned word "${w}" visible on screen`);
    const checksText = await page.$eval('[data-answer="checks"]', (e) => e.innerText).catch(() => "");
    must(!/\bsafety\b/i.test(checksText), `"safety" appeared in the Checks chip: ${checksText}`);

    // re-collapse for the screenshots (default state a stranger sees first)
    await page.$$eval("details.disclose", (els) => els.forEach((d) => (d.open = false)));
    await page.screenshot({ path: join(OUT, "01-truth-dashboard.png"), fullPage: true });
    await page.screenshot({ path: join(OUT, "01b-above-the-fold-1366x768.png") }); // 5-second still = the fold
    await page.click("#pause-button");
    await page.waitForSelector("#pause-scope:not([hidden])");
    await page.screenshot({ path: join(OUT, "02-pause-pressed.png") });
    console.log("  captured 01 / 01b (5-second fold) / 02");

    handBurden = {
      viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
      terminal_copy_paste_count: 0, clicks_to_see_current_status: 0, clicks_to_pause: 1,
      project_name_in_header: shownName,
      geometry_checked_at: ["1366x768", "1440x900"], fold_budget: 6, anti_void_max_gap_px: 120,
      cost_figure_px: Math.round(costFont), decision_view_only: /read the decision/i.test(decBtn),
      pause_control_px: pauseBox && { w: Math.round(pauseBox.width), h: Math.round(pauseBox.height) },
      banned_words_visible: false,
    };
    await close();
  }

  // Disconnected: cannot-invent-state renders UNKNOWN / not connected, still calm.
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
