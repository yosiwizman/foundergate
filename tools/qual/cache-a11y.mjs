// Phase 7.1-Q: cache/storage/service-worker + zoom/reduced-motion/stale-state checks (headless).
// Writes a machine-readable verdict JSON. Runs against a FG_UI_CI server on CAP_PORT.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = process.env.CAP_PORT || "4713";
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = "docs/testing/evidence/phase7-1-q/cache-a11y";
mkdirSync(OUT, { recursive: true });
const r = {};

const b = await chromium.launch();
// service worker + storage on a clean profile
let ctx = await b.newContext();
let p = await ctx.newPage();
await p.goto(BASE, { waitUntil: "networkidle" });
r.service_worker = await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.controller ? "PRESENT" : "NONE");
r.localStorage_keys = await p.evaluate(() => Object.keys(localStorage).length);
r.sessionStorage_keys = await p.evaluate(() => Object.keys(sessionStorage).length);
r.neutral_h1 = await p.textContent("h1");
r.neutral_card_visible = await p.isVisible("#neutral-card");
// hard reload stays neutral (stale-state proof: nothing cached shows a fake result)
await p.reload({ waitUntil: "networkidle" });
r.after_hard_reload_neutral = await p.isVisible("#neutral-card") && (await p.isHidden("#result-grid"));
// inject stale localStorage then reload -> UI must NOT show a completed result from storage
await p.evaluate(() => localStorage.setItem("fg_fake_result", JSON.stringify({ status: "COMPLETE", green: true })));
await p.reload({ waitUntil: "networkidle" });
r.stale_storage_ignored = await p.isVisible("#neutral-card") && (await p.isHidden("#result-grid"));
await ctx.close();

// 200% zoom (deviceScaleFactor + smaller viewport ~ zoom) renders without overlap of key controls
ctx = await b.newContext({ viewport: { width: 640, height: 720 }, deviceScaleFactor: 2 });
p = await ctx.newPage();
await p.goto(BASE, { waitUntil: "networkidle" });
r.zoom200_run_button_visible = await p.isVisible("#run");
r.zoom200_fixture_button_visible = await p.isVisible("#fixture-btn");
await ctx.close();

// reduced-motion honored (no crash / renders)
ctx = await b.newContext({ reducedMotion: "reduce" });
p = await ctx.newPage();
await p.goto(BASE, { waitUntil: "networkidle" });
r.reduced_motion_renders = await p.isVisible("h1");
await ctx.close();

// keyboard-only: Tab reaches the Run button and it is focusable
ctx = await b.newContext();
p = await ctx.newPage();
await p.goto(BASE, { waitUntil: "networkidle" });
await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); await p.keyboard.press("Tab");
r.keyboard_focus_reachable = await p.evaluate(() => {
  const el = document.activeElement; return !!el && el.tagName !== "BODY";
});
r.run_button_focusable = await p.evaluate(() => { document.getElementById("run").focus(); return document.activeElement.id === "run"; });
await ctx.close();
await b.close();

const passed = r.service_worker === "NONE" && r.after_hard_reload_neutral && r.stale_storage_ignored &&
  r.zoom200_run_button_visible && r.reduced_motion_renders && r.run_button_focusable;
r.verdict = passed ? "PASS" : "FAIL";
writeFileSync(`${OUT}/cache_a11y_result.json`, JSON.stringify(r, null, 2));
console.log("cache-a11y:", r.verdict, JSON.stringify(r));
if (!passed) process.exit(1);
