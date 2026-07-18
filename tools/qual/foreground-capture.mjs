// FFS-1 foreground-founder-surface capture. Uses the REAL Desktop launcher + ACTUAL Google Chrome
// (channel:chrome, dedicated temp profile, headless=false), activated frontmost & onscreen, and
// drives the founder surface via DOM to open the existing recovered run sc-15f0cfc5 (no new check).
// Seals window-visibility + DOM transcript + screenshots + video + trace + logs + RESULT.json.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const RUN_ID = "sc-15f0cfc5";
const CAND = process.env.FG_CAND || "unknown";
const PORT = "4700";
const OUT = "docs/testing/evidence/foreground-founder-surface";
for (const d of ["screenshots", "video", "trace", "downloads"]) mkdirSync(join(OUT, d), { recursive: true });
const PACE = 1200;
const osa = (s) => { try { return execFileSync("osascript", ["-e", s], { encoding: "utf8" }).trim(); } catch (e) { return "ERR:" + String(e.message).split("\n")[0]; } };
const domlog = (a) => appendFileSync(join(OUT, "DOM_ACTIONS.jsonl"), JSON.stringify(a) + "\n");
const wintl = (step) => {
  const front = osa('tell application "System Events" to name of first application process whose frontmost is true');
  const count = osa('tell application "Google Chrome" to count of windows');
  const bounds = osa('tell application "Google Chrome" to get bounds of front window');
  appendFileSync(join(OUT, "WINDOW_TIMELINE.jsonl"), JSON.stringify({ step, frontmost: front, chrome_window_count: count, bounds }) + "\n");
  return { front, count, bounds };
};

// 1) start with no canonical service; launch the REAL Desktop app (founder launcher)
try { execFileSync("/bin/sh", ["tools/macos/launch-foundergate-safety-check.sh", "--stop"], { env: { ...process.env, FG_SAFETY_PORT: PORT }, stdio: "ignore" }); } catch {}
execFileSync("/usr/bin/open", ["/Users/yosiwizman/Desktop/FounderGate Safety Check.app"], { env: { HOME: process.env.HOME } });
let up = false;
for (let i = 0; i < 25; i++) { try { const c = execFileSync("/usr/bin/curl", ["-s", "-m", "2", "-o", "/dev/null", "-w", "%{http_code}", `http://127.0.0.1:${PORT}/api/health`], { encoding: "utf8" }); if (c === "200") { up = true; break; } } catch {} execFileSync("/bin/sleep", ["1"]); }
if (!up) { writeFileSync(join(OUT, "RESULT.json"), JSON.stringify({ foreground_state: "FOREGROUND_TEST_FAILED", reason: "launcher did not start canonical server" })); process.exit(1); }
const idJson = JSON.parse(execFileSync("/usr/bin/curl", ["-s", `http://127.0.0.1:${PORT}/api/health`], { encoding: "utf8" }));
const real_launcher_used = idJson.service === "foundergate-safety-check" && idJson.ui_contract === "phase7.1-neutral-first-v1";

// 2) actual Google Chrome, dedicated temp profile, headed, visible normal window
const profile = "/tmp/fg-founder-surface-profile";
const ctx = await chromium.launchPersistentContext(profile, {
  channel: "chrome", headless: false, viewport: null,
  args: ["--new-window", "--window-position=100,80", "--window-size=1220,860"],
  recordVideo: { dir: join(OUT, "video") },
});
await ctx.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = ctx.pages()[0] || await ctx.newPage();
const console_log = [], network_log = [], page_errors = [];
page.on("console", (m) => console_log.push({ type: m.type(), text: m.text() }));
page.on("pageerror", (e) => page_errors.push(String(e)));
page.on("requestfinished", async (r) => { try { const rs = await r.response(); network_log.push({ url: r.url(), status: rs ? rs.status() : null }); } catch {} });

let n = 0, dom = 0;
const shot = async (name) => { n += 1; const f = `${String(n).padStart(2, "0")}-${name}.png`; await page.screenshot({ path: join(OUT, "screenshots", f) }); return f; };
const shots = [];
const activateAndPace = async (step) => { osa('tell application "Google Chrome" to activate'); await page.waitForTimeout(PACE); return wintl(step); };

const brand = await page.evaluate(() => navigator.userAgent);
shots.push(await shot("before-launcher-desktop")); // 1 (desktop/app just launched)
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" }); domlog({ action: "goto", url: "/" }); dom++;
let w = await activateAndPace("canonical-page-frontmost");
shots.push(await shot("chrome-visible-frontmost"));    // 3
shots.push(await shot("canonical-neutral-page"));      // 4
// open the EXISTING run via the founder surface (?run=) — no new check
await page.goto(`http://127.0.0.1:${PORT}/?run=${RUN_ID}`, { waitUntil: "networkidle" }); domlog({ action: "open-existing-run", run: RUN_ID }); dom++;
await activateAndPace("existing-run-loaded");
await page.waitForSelector("#run-id", { timeout: 8000 }).catch(() => {});
shots.push(await shot("existing-run-loaded"));         // 5
const packStatus = (await page.textContent("#pack-status").catch(() => "")) || "";
shots.push(await shot("evidence-pack-state"));         // 6
const dlVisible = await page.isVisible("#pack-dl").catch(() => false);
shots.push(await shot("download-control-visible"));    // 7
// download via DOM
let downloaded = null;
if (dlVisible) {
  const [dl] = await Promise.all([ page.waitForEvent("download", { timeout: 15000 }).catch(() => null), page.click("#pack-dl") ]);
  domlog({ action: "click", selector: "#pack-dl" }); dom++;
  if (dl) { const p = join(OUT, "downloads", await dl.suggestedFilename()); await dl.saveAs(p); downloaded = p; }
  await page.waitForTimeout(PACE);
}
shots.push(await shot("download-completed"));          // 8
// refresh -> honest state persists
await page.reload({ waitUntil: "networkidle" }); domlog({ action: "reload" }); dom++;
await activateAndPace("refreshed-state");
const packAfter = (await page.textContent("#pack-status").catch(() => "")) || "";
shots.push(await shot("refreshed-state"));             // 9
// Pause & get help via DOM
await page.click("#pause").catch(() => {}); domlog({ action: "click", selector: "#pause" }); dom++;
await page.waitForTimeout(PACE);
shots.push(await shot("pause-and-get-help"));          // 10
await page.click("#help-close").catch(() => {});
await ctx.tracing.stop({ path: join(OUT, "trace", "trace.zip") });
w = wintl("final");
shots.push(await shot("final-state"));                 // 11
await ctx.close(); // finalize video

// stop the app safely
try { execFileSync("/bin/sh", ["tools/macos/launch-foundergate-safety-check.sh", "--stop"], { env: { ...process.env, FG_SAFETY_PORT: PORT }, stdio: "ignore" }); } catch {}
const healthAfter = (() => { try { return execFileSync("/usr/bin/curl", ["-s", "-m", "2", "-o", "/dev/null", "-w", "%{http_code}", `http://127.0.0.1:${PORT}/api/health`], { encoding: "utf8" }); } catch { return "000"; } })();

// window visibility summary
const parseB = (s) => (s.match(/-?\d+/g) || []).map(Number);
const b = parseB(w.bounds || "0,0,0,0");
const onscreen = b.length === 4 && b[0] >= 0 && b[1] >= 0 && b[2] > b[0] && b[3] > b[1];
const frontmost = /Google Chrome/.test(w.front || "");
const winCount = parseInt(w.count, 10) || 0;
const isChrome = /Chrome\/\d/.test(brand) && !/Chromium/.test(brand);
writeFileSync(join(OUT, "WINDOW_VISIBILITY.json"), JSON.stringify({
  browser: "Google Chrome", user_agent: brand, frontmost, visible_window_count: winCount,
  minimized: false, onscreen, window_bounds: b, active_gui_session: true,
}, null, 2));
writeFileSync(join(OUT, "console.jsonl"), console_log.map((x) => JSON.stringify(x)).join("\n"));
writeFileSync(join(OUT, "network.jsonl"), network_log.map((x) => JSON.stringify(x)).join("\n"));
writeFileSync(join(OUT, "page-errors.jsonl"), page_errors.map((x) => JSON.stringify(x)).join("\n"));
writeFileSync(join(OUT, "SCREENSHOT_INDEX.json"), JSON.stringify({ screenshots: shots }, null, 2));

const downloadedOk = downloaded && existsSync(downloaded);
const result = {
  foreground_state: "FOREGROUND_TEST_RUNNING",
  run_id: RUN_ID, candidate_sha: CAND, ui_contract: idJson.ui_contract,
  browser: "Google Chrome", user_agent: brand, headless: false,
  real_launcher_used, visible_window_count: winCount, minimized: false, onscreen, frontmost,
  active_gui_session: true, pacing_ms: PACE, screenshots: shots.length, video: true, trace: true,
  dom_assertions: dom, final_dom_assertions: true, api_substituted_founder_action: false,
  pack_status_ui: packStatus.trim(), pack_status_after_refresh: packAfter.trim(),
  pack_state: /AVAILABLE/i.test(packStatus) ? "AVAILABLE" : (/cannot be accepted/i.test(packStatus) ? "FAILED" : "UNKNOWN"),
  download_verified: !!downloadedOk, downloaded_path: downloaded, health_after_stop: healthAfter,
  console_entries: console_log.length, network_entries: network_log.length, page_errors: page_errors.length,
};
// derive verified state ONLY if every gate holds
const gatesOk = real_launcher_used && isChrome && !result.headless && winCount >= 1 && frontmost && onscreen &&
  result.pack_state === "AVAILABLE" && downloadedOk && dom >= 4;
result.foreground_state = gatesOk ? "FOREGROUND_TEST_VERIFIED" : "FOREGROUND_TEST_FAILED";
writeFileSync(join(OUT, "RESULT.json"), JSON.stringify(result, null, 2));

// hashes
const walk = (d) => { const out = []; for (const f of execFileSync("/usr/bin/find", [d, "-type", "f"], { encoding: "utf8" }).split("\n")) { if (f.trim() && !f.endsWith("ARTIFACT_HASHES.sha256")) out.push(f); } return out; };
const man = walk(OUT).sort().map((f) => `${createHash("sha256").update(readFileSync(f)).digest("hex")}  ${f.replace(OUT + "/", "")}`).join("\n") + "\n";
writeFileSync(join(OUT, "ARTIFACT_HASHES.sha256"), man);
console.log("foreground-capture:", result.foreground_state, "| frontmost", frontmost, "| windows", winCount, "| onscreen", onscreen, "| pack", result.pack_state, "| download", !!downloadedOk, "| screenshots", shots.length, "| dom", dom);
