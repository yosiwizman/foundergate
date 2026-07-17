// Headed (visible) Mac Playwright qualification capture for the Phase 7.1 Safety Check UI.
// Runs against a deterministic FG_UI_CI server (labeled CI-FIXTURE; no VM) so the full UI flow is
// exercised. Captures numbered screenshots + one video + one trace + console/network/page-error logs.
// NOT a substitute for headless exact-SHA CI (run separately) or the real live run (sc-0bc1b04f).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const PORT = process.env.CAP_PORT || "4713";
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = "docs/testing/evidence/phase7-1-q/headed";
const SHOTS = `${OUT}/screenshots`;
mkdirSync(SHOTS, { recursive: true });

const console_log = [], network_log = [], page_errors = [];
let n = 0;
const shot = async (page, name) => {
  n += 1;
  const id = String(n).padStart(2, "0");
  await page.screenshot({ path: `${SHOTS}/${id}-${name}.png` });
  return `${id}-${name}.png`;
};

const browser = await chromium.launch({ headless: false, slowMo: 120 });
const context = await browser.newContext({
  viewport: { width: 1100, height: 860 },
  recordVideo: { dir: `${OUT}/video`, size: { width: 1100, height: 860 } },
});
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
page.on("console", (m) => console_log.push({ type: m.type(), text: m.text() }));
page.on("pageerror", (e) => page_errors.push(String(e)));
page.on("requestfinished", async (r) => {
  try { const resp = await r.response(); network_log.push({ url: r.url(), method: r.method(), status: resp ? resp.status() : null }); }
  catch { network_log.push({ url: r.url(), method: r.method(), status: null }); }
});

const states = [];
await page.goto(BASE, { waitUntil: "networkidle" });
states.push(await shot(page, "neutral-initial"));                       // 4 neutral initial page
await page.reload({ waitUntil: "networkidle" });
states.push(await shot(page, "normal-refresh-still-neutral"));          // 5 normal refresh
await page.click("#fixture-btn");
states.push(await shot(page, "fixture-selected"));                      // 6 fixture selected
states.push(await shot(page, "before-check"));                         // 7 before check
await page.click("#run");
await page.waitForTimeout(600);
states.push(await shot(page, "check-started-run-id"));                  // 8/9 started + run id
// wait for completion (FG_UI_CI completes quickly)
await page.waitForSelector("#result-grid:not([hidden])", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);
states.push(await shot(page, "runtime-complete"));                     // 12 completion
states.push(await shot(page, "exact-version-and-snapshot"));            // 13/14 version + snapshot
states.push(await shot(page, "compileability-and-not-proven-badges")); // 15-19 badges
await page.evaluate(() => document.querySelector("#finish-grid")?.scrollIntoView());
states.push(await shot(page, "cleanup-and-evidence-pack"));            // 21/22 cleanup + pack
// Evidence details expand
await page.click("#evidence summary").catch(() => {});
states.push(await shot(page, "evidence-details-raw"));
// Pause & get help
await page.click("#pause");
await page.waitForTimeout(300);
states.push(await shot(page, "pause-and-get-help-open"));               // 24 pause modal
await page.click("#help-close").catch(() => {});
// HELD: another public github URL
await page.fill("#url", "https://github.com/torvalds/linux");
await page.click("#run");
await page.waitForTimeout(500);
states.push(await shot(page, "held-other-public-url"));                 // 25 held
// REFUSED: ssh url
await page.fill("#url", "git@github.com:foo/bar.git");
await page.click("#run");
await page.waitForTimeout(500);
states.push(await shot(page, "refused-ssh-url"));                       // 26 refused
// completion refresh
await page.goto(BASE, { waitUntil: "networkidle" });
states.push(await shot(page, "relaunch-neutral-canonical"));           // 27-29 neutral relaunch

await context.tracing.stop({ path: `${OUT}/trace.zip` });
writeFileSync(`${OUT}/console_log.json`, JSON.stringify(console_log, null, 2));
writeFileSync(`${OUT}/network_log.json`, JSON.stringify(network_log, null, 2));
writeFileSync(`${OUT}/page_errors.json`, JSON.stringify(page_errors, null, 2));
await context.close(); // finalizes video
await browser.close();
writeFileSync(`${OUT}/STATES_INDEX.json`, JSON.stringify({ base: BASE, screenshots: states,
  console_entries: console_log.length, network_entries: network_log.length,
  page_errors: page_errors.length }, null, 2));
console.log(`headed-capture: ${states.length} screenshots; ${console_log.length} console; ${network_log.length} network; ${page_errors.length} page-errors`);
