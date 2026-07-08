// FounderGate V8-A2 — Preview Bay Playwright smoke (A2-PA evidence).
//
// Screenshots the Preview Bay in its key states against a temp project copy (the
// committed fixture is never mutated): idle, preview-running (embedded sandboxed
// app + always-on labels), and the C7 failure state (no-live guard refuses a live
// preview → plain-English message, never blank/fake). Loopback only.
//
//   PLAYWRIGHT_NODE_MODULES=/abs/node_modules node src/v8a2/preview/smoke.mjs

import { mkdtempSync, writeFileSync, cpSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createA2Server } from "../server.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..");
const FIXTURE = join(REPO, "src", "v8a1", "fixture", "mock-project");
const OUT = join(REPO, "docs", "assembly-evidence", "A2-PA", "screenshots");
mkdirSync(OUT, { recursive: true });

const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js")) : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

const failures = [];
const must = (c, m) => { if (!c) failures.push(m); };

function tempProject(mutate) {
  const p = mkdtempSync(join(tmpdir(), "v8a2-smoke-"));
  cpSync(FIXTURE, p, { recursive: true });
  if (mutate) {
    const cfgPath = join(p, ".foundergate", "preview.json");
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    writeFileSync(cfgPath, JSON.stringify(mutate(cfg)));
  }
  return p;
}

async function serve(projectRoot) {
  const server = createA2Server(projectRoot);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, port: server.address().port, close: () => new Promise((r) => server.close(r)) };
}

const browser = await chromium.launch();
const temps = [];
try {
  // 1. idle + 2. running (safe fixture)
  {
    const proj = tempProject(); temps.push(proj);
    const s = await serve(proj);
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`http://127.0.0.1:${s.port}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('body[data-rendered="true"]');
    await page.screenshot({ path: join(OUT, "01-preview-idle.png"), fullPage: true });

    await page.click('.btn[data-action="start"]');
    await page.waitForSelector("#preview-frame:not([hidden])", { timeout: 6000 });
    await page.waitForTimeout(400);
    const chip = await page.textContent("#status-chip");
    must(/running/i.test(chip), `status chip not running: ${chip}`);
    const sends = await page.getAttribute('.lbl[data-label="sends"] b', null).catch(() => null);
    const sendsText = await page.textContent('.lbl[data-label="sends"]');
    must(/off/i.test(sendsText), `sends label not off: ${sendsText}`);
    await page.screenshot({ path: join(OUT, "02-preview-running.png"), fullPage: true });

    await page.click('.btn[data-action="stop"]');
    await page.close();
    await s.close();
    console.log("  captured 01-preview-idle.png + 02-preview-running.png");
  }

  // 3. C7 failure state — a live preview is refused (no-live guard)
  {
    const proj = tempProject((cfg) => ({ ...cfg, environment: "live" })); temps.push(proj);
    const s = await serve(proj);
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`http://127.0.0.1:${s.port}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('body[data-rendered="true"]');
    await page.click('.btn[data-action="start"]');
    await page.waitForSelector("#failure:not([hidden])", { timeout: 6000 });
    const ftext = await page.textContent("#failure");
    must(/could not start/i.test(ftext) && /live/i.test(ftext), `failure text not C7: ${ftext}`);
    await page.screenshot({ path: join(OUT, "03-preview-failure-nolive.png"), fullPage: true });
    await page.close();
    await s.close();
    console.log("  captured 03-preview-failure-nolive.png");
  }
} finally {
  await browser.close();
  for (const p of temps) { try { rmSync(p, { recursive: true, force: true }); } catch {} }
}

if (failures.length) { console.error(`\nV8A2-PREVIEW-SMOKE: FAIL (${failures.length})`); failures.forEach((f) => console.error("  - " + f)); process.exit(1); }
console.log(`\nV8A2-PREVIEW-SMOKE: PASS — screenshots in ${OUT}`);
