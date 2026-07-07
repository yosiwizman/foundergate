// FounderGate V8-A1 — Playwright smoke screenshots (A24).
//
// Renders the Truth Dashboard in a real browser and captures a screenshot of
// every V8-A1 screen state, proving each screen renders and its primary action
// works. LOCAL evidence generation (browsers not required in CI).
//
// Run (browsers via the local Playwright cache; no absolute path is committed):
//   NODE_PATH="$(npm root -g)/../.npm/_npx/*/node_modules" node src/v8a1/dashboard/smoke.mjs
// or simply run through the npx-provided module resolution. Output PNGs go to
//   docs/assembly-evidence/B2/screenshots/
//
// It writes ONLY screenshots into the evidence folder; it changes no project data.

import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createDashboardServer } from "./server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");
const OUT = join(REPO, "docs", "assembly-evidence", "B2", "screenshots");
const FIXTURE = resolve(HERE, "..", "fixture", "mock-project");
const PORT = Number(process.env.FG_SMOKE_PORT || 4199);

// Resolve Playwright (CJS) from a normal install, or — for a local cache run —
// from a node_modules dir given by PLAYWRIGHT_NODE_MODULES (absolute path passed
// via env only, so no machine-specific path is ever committed to the repo).
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js"))
  : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

mkdirSync(OUT, { recursive: true });

async function shoot(browser, projectRoot, name, action) {
  const server = createDashboardServer(projectRoot);
  await new Promise((r) => server.listen(PORT, r));
  const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-rendered="true"]', { timeout: 5000 });
  if (action) await action(page);
  await page.screenshot({ path: join(OUT, name), fullPage: true });
  console.log(`  captured ${name}`);
  await page.close();
  await new Promise((r) => server.close(r));
}

const browser = await chromium.launch();
try {
  // 1. Full Truth Dashboard on the MOCK_ONLY fixture (all V8-A1 screens/cards).
  await shoot(browser, FIXTURE, "01-truth-dashboard.png");
  // 2. Primary action: Panic Card pressed → honest scope revealed.
  await shoot(browser, FIXTURE, "02-panic-pressed.png", async (page) => {
    await page.click("#panic-button");
    await page.waitForSelector("#panic-scope:not([hidden])");
  });
  // 3. Cannot-invent-state: a disconnected project renders UNKNOWN, never green.
  await shoot(browser, join(REPO, "src", "v8a1"), "03-not-connected-unknown.png");
  console.log("V8A1-SMOKE: captured 3 screenshots ->", OUT);
} finally {
  await browser.close();
}
