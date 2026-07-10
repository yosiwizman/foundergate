// FounderGate V8-A3 — File Cabinet Playwright smoke (A3-FC-UI evidence).
//
// Screenshots the File Cabinet: the tree with a data-class badge on every file,
// a SECRET file showing HIDDEN (blocked, no content), an UNKNOWN file BLOCKED, and
// a safe founder document PREVIEWED. Read-only against the fixture; loopback only.
//
//   PLAYWRIGHT_NODE_MODULES=/abs/node_modules node src/v8a3/filecabinet/smoke.mjs

import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createCabinetServer } from "./server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");
const FIXTURE = join(REPO, "src", "v8a1", "fixture", "mock-project");
const OUT = join(REPO, "docs", "assembly-evidence", "A3-FC-UI", "screenshots");
mkdirSync(OUT, { recursive: true });

const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js")) : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

const failures = [];
const must = (c, m) => { if (!c) failures.push(m); };

const server = createCabinetServer(FIXTURE);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-rendered="true"]');
  // every file row carries a data-class badge
  const badges = await page.$$eval(".filerow .badge", (els) => els.length);
  const rows = await page.$$eval(".filerow", (els) => els.length);
  must(badges === rows && rows >= 8, `every file must have a badge (${badges}/${rows})`);
  await page.screenshot({ path: join(OUT, "01-tree-with-badges.png"), fullPage: true });

  // SECRET file → hidden/blocked, no content
  await page.click('.filerow[data-path="mock-config.txt"]');
  await page.waitForFunction(() => document.body.dataset.opened === "SECRET");
  const secretText = await page.textContent("#viewer-blocked");
  must(/protected|secret/i.test(secretText), `SECRET file should show a protected note: ${secretText}`);
  const bodyVisible = await page.$eval("#viewer-body", (e) => !e.hidden).catch(() => false);
  must(!bodyVisible, "SECRET content must not be shown");
  await page.screenshot({ path: join(OUT, "02-secret-hidden.png"), fullPage: true });

  // UNKNOWN file → blocked
  await page.click('.filerow[data-path="mystery.dat"]');
  await page.waitForFunction(() => document.body.dataset.opened === "UNKNOWN");
  const unk = await page.textContent("#viewer-blocked");
  must(/blocked|classified/i.test(unk), `UNKNOWN should show blocked note: ${unk}`);
  await page.screenshot({ path: join(OUT, "03-unknown-blocked.png"), fullPage: true });

  // safe founder doc → previewed with content
  await page.click('.filerow[data-path="docs/CURRENT_STATUS.md"]');
  await page.waitForFunction(() => document.body.dataset.opened === "PUBLIC_SAFE");
  const content = await page.textContent("#viewer-body");
  must(/MOCK_ONLY founder document/.test(content), "safe doc should preview content");
  await page.screenshot({ path: join(OUT, "04-preview-safe.png"), fullPage: true });

  // no scary words visible anywhere
  const all = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  for (const w of ["panic", "fatal", "abort"]) must(!new RegExp(`\\b${w}\\b`).test(all), `banned word "${w}" visible`);

  await page.close();
  console.log("  captured 01..04 File Cabinet screenshots");
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

if (failures.length) { console.error(`\nV8A3-CABINET-SMOKE: FAIL (${failures.length})`); failures.forEach((f) => console.error("  - " + f)); process.exit(1); }
console.log(`\nV8A3-CABINET-SMOKE: PASS — screenshots in ${OUT}`);
