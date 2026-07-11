// FounderGate — VISUAL-REVIEW CAPTURE harness (Assembly Manual §23 + §27).
//
// Generates the visual-review screenshots the law requires — but at a TRUE viewport,
// and it looks INSIDE the sandboxed preview embed. It exists because two review defects
// were proven at the Run-6 abort:
//   (1) VIEWPORT TRUTH — a hand-captured review rendered at ~1593×1166 while claiming
//       1366×768, so "above the fold / no void" verdicts were untrustworthy. Here every
//       page is opened at an EXACT viewport with deviceScaleFactor pinned to 1, and the
//       harness FAILS if the page's reported innerWidth/innerHeight ≠ the requested size.
//   (2) IN-EMBED BLINDNESS — the old preview guard photographed the parent page; a
//       fullPage shot never expands an <iframe>'s internal scroll, so the café "Send"
//       button clipped by the fixed embed height was invisible to the machine. Here the
//       harness opens the café's OWN url at the embed's fixed height and MEASURES whether
//       the primary action (Send) is inside the frame — clipped content now fails loudly.
//
//   PLAYWRIGHT_NODE_MODULES=/abs/node_modules node src/tools/visual-capture.mjs
//
// Not part of `npm test` (needs a browser). Run before any witness/stranger/gallery
// handoff; its static contract is locked in CI by visual-capture.selftest.mjs.

import { mkdirSync, mkdtempSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { get as httpGet } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { APPS } from "../../scripts/start-stranger-test.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const OUT = join(REPO, "docs", "assembly-evidence", "visual-review");
mkdirSync(OUT, { recursive: true });

// TRUE viewports — the law's two sizes, captured exactly (no scaling).
const VIEWPORTS = [{ w: 1366, h: 768 }, { w: 1440, h: 900 }];
const SCREENS = [
  { shot: "dashboard", port: 4173, marker: "Truth Dashboard" },
  { shot: "preview", port: 4300, marker: "Preview Bay" },
  { shot: "filecabinet", port: 4400, marker: "File Cabinet" },
  { shot: "guide", port: 4500, marker: "Project Guide" },
];
// The preview embed's FIXED height, parsed from the real CSS so it tracks the product.
const EMBED_H = (() => {
  const css = readFileSync(join(REPO, "src", "v8a2", "preview", "ui", "preview-bay.css"), "utf8");
  const m = css.match(/#preview-frame\s*\{[^}]*height:\s*(\d+)px/);
  return m ? Number(m[1]) : 420;
})();

const anchor = process.env.PLAYWRIGHT_NODE_MODULES
  ? pathToFileURL(join(process.env.PLAYWRIGHT_NODE_MODULES, "_anchor.js")) : import.meta.url;
const { chromium } = createRequire(anchor)("playwright");

const failures = [];
const must = (cond, msg) => { if (!cond) { failures.push(msg); console.error(`  ✗ ${msg}`); } };

function serves(port, marker) {
  return new Promise((res) => {
    const req = httpGet({ hostname: "127.0.0.1", port, path: "/", timeout: 2000 }, (r) => {
      let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res(b.includes(marker)));
    });
    req.on("error", () => res(false)); req.on("timeout", () => { req.destroy(); res(false); });
  });
}

// Spawn the real app servers against a throwaway fixture copy (never the committed one).
const SESSION_ROOT = mkdtempSync(join(tmpdir(), "fg-visual-"));
cpSync(join(REPO, "src", "v8a1", "fixture", "mock-project"), SESSION_ROOT, { recursive: true });
const kids = APPS.map((app) => spawn(process.execPath, [join(REPO, app.entry)], {
  cwd: REPO, env: { ...process.env, ...app.env, FG_PROJECT_ROOT: SESSION_ROOT }, stdio: ["ignore", "ignore", "inherit"],
}));
const stop = () => { for (const k of kids) { try { k.kill("SIGTERM"); } catch { /* gone */ } } };

// wait for all to serve their own page
{
  const deadline = Date.now() + 10000;
  let ready = false;
  while (Date.now() < deadline && !ready) {
    ready = (await Promise.all(SCREENS.map((s) => serves(s.port, s.marker)))).every(Boolean);
    if (!ready) await new Promise((r) => setTimeout(r, 400));
  }
  if (!ready) { console.error("servers did not come up"); stop(); process.exit(1); }
}

// Assert the browser actually gave us the viewport we asked for (VIEWPORT TRUTH).
async function assertTrueViewport(page, w, h, label) {
  const rv = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }));
  must(rv.w === w && rv.h === h, `viewport mismatch for ${label}: requested ${w}×${h}, page reports ${rv.w}×${rv.h} — review geometry would be untrustworthy`);
  must(rv.dpr === 1, `devicePixelRatio must be pinned to 1 for ${label}, got ${rv.dpr}`);
}

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const tag = `${vp.w}x${vp.h}`;
    for (const sc of SCREENS) {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
      await page.goto(`http://127.0.0.1:${sc.port}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      await assertTrueViewport(page, vp.w, vp.h, `${sc.shot} ${tag}`);
      await page.screenshot({ path: join(OUT, `${sc.shot}-${tag}-full.png`), fullPage: true });
      await page.screenshot({ path: join(OUT, `${sc.shot}-${tag}-fold.png`), clip: { x: 0, y: 0, width: vp.w, height: vp.h } });
      await page.close();
      console.log(`  captured ${sc.shot}-${tag} (true ${tag})`);
    }

    // IN-EMBED CAPTURE — open the café's OWN url at the embed's fixed height and MEASURE
    // whether the primary action (Send) is inside the frame. This is the machine looking
    // inside the sandboxed iframe the parent-page shot can never see.
    const driver = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    await driver.goto(`http://127.0.0.1:4300/`, { waitUntil: "networkidle" });
    await driver.click('.btn[data-action="start"]');
    await driver.waitForSelector('#preview-frame:not([hidden])', { timeout: 6000 });
    const cafeUrl = await driver.evaluate(async () => (await (await fetch("/api/preview/status")).json()).url);
    await driver.close();

    if (cafeUrl) {
      const embedW = vp.w - 244 - 40; // content column minus sidebar + padding (approx embed width)
      const frame = await browser.newPage({ viewport: { width: embedW, height: EMBED_H }, deviceScaleFactor: 1 });
      await frame.goto(cafeUrl, { waitUntil: "networkidle" });
      await frame.waitForTimeout(200);
      await frame.screenshot({ path: join(OUT, `preview-embed-${tag}-full.png`) });
      // measure the primary action button against the fixed embed height
      const send = await frame.evaluate((H) => {
        const el = document.querySelector("#mock-send")
          || [...document.querySelectorAll("button,input[type=submit],a")].find((e) => /send|order|place|checkout|pay/i.test(e.textContent || e.value || ""));
        if (!el) return { found: false };
        const r = el.getBoundingClientRect();
        return { found: true, bottom: Math.round(r.bottom), top: Math.round(r.top), withinFrame: r.bottom <= H && r.top >= 0, H };
      }, EMBED_H);
      must(send.found, `${tag}: could not find the café primary action (Send) to measure against the embed`);
      if (send.found) {
        must(send.withinFrame, `${tag}: café "Send" is CLIPPED by the ${EMBED_H}px embed (button bottom=${send.bottom}px > ${EMBED_H}px) — a stranger cannot reach step 2 at a glance`);
      }
      await frame.close();
      console.log(`  in-embed: café Send ${send.found ? (send.withinFrame ? "VISIBLE" : `CLIPPED (bottom ${send.bottom}px > ${EMBED_H}px)`) : "NOT FOUND"} at ${tag}`);
    }
  }
} finally {
  await browser.close();
  stop();
}

if (failures.length) { console.error(`\nV8-VISUAL-CAPTURE: FAIL (${failures.length})`); process.exit(1); }
console.log(`\nV8-VISUAL-CAPTURE: PASS — true-viewport + in-embed screenshots in ${OUT}`);
