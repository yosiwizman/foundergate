// FounderGate V8-A2 — Bug Collector Playwright smoke (A2-BC evidence).
//
// Drives the real "Report Problem" flow in the Preview Bay UI against a temp
// project copy: open the form → type a note → send → the server stores a
// data-classified evidence packet under .foundergate/bugs and the UI confirms.
// Screenshots the bug-captured state. Loopback only; no fixture mutation.

import { mkdtempSync, cpSync, existsSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createA2Server } from "../server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");
const FIXTURE = join(REPO, "src", "v8a1", "fixture", "mock-project");
const OUT = join(REPO, "docs", "assembly-evidence", "A2-BC", "screenshots");
mkdirSync(OUT, { recursive: true });

const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js")) : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

const failures = [];
const must = (c, m) => { if (!c) failures.push(m); };

const proj = mkdtempSync(join(tmpdir(), "v8a2-bc-"));
cpSync(FIXTURE, proj, { recursive: true });
const server = createA2Server(proj);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-rendered="true"]');

  await page.click("#report");
  await page.waitForSelector("#report-form:not([hidden])");
  await page.fill("#bug-note", "The Start button felt hard to find.");
  await page.screenshot({ path: join(OUT, "01-report-form.png"), fullPage: true });

  await page.click("#bug-send");
  await page.waitForFunction(() => document.body.dataset.bugStored === "true", { timeout: 5000 });
  const result = await page.textContent("#bug-result");
  must(/saved as evidence/i.test(result), `bug result not confirmed: ${result}`);
  await page.screenshot({ path: join(OUT, "02-bug-captured.png"), fullPage: true });

  // the packet was actually stored under .foundergate/bugs
  const bugsDir = join(proj, ".foundergate", "bugs");
  must(existsSync(bugsDir) && readdirSync(bugsDir).some((f) => f.endsWith(".json")), "no bug packet stored on disk");

  await page.close();
  console.log("  captured 01-report-form.png + 02-bug-captured.png; packet stored on disk");
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  rmSync(proj, { recursive: true, force: true });
}

if (failures.length) { console.error(`\nV8A2-BUG-SMOKE: FAIL (${failures.length})`); failures.forEach((f) => console.error("  - " + f)); process.exit(1); }
console.log(`\nV8A2-BUG-SMOKE: PASS — screenshots in ${OUT}`);
