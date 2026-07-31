// Wave-1B cross-browser + a11y test: render the COMPOSED founder-view with a hostile
// run_id in a REAL browser DOM and assert it stays inert (closes the runtime run_id
// injection gap for the composed view). Runs under chromium/firefox/webkit.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const SHOTS = process.env.L3_SHOTS, A11Y = process.env.L3_A11Y;
mkdirSync(SHOTS, { recursive: true }); mkdirSync(A11Y, { recursive: true });
test("composed founder-view renders hostile run_id inert (real browser)", async ({ page }, info) => {
  await page.goto("/visual-fixtures/founder-view.html", { waitUntil: "load" });
  await page.waitForFunction(() => window.__L3_READY === true, null, { timeout: 10000 });
  const txt = await page.getByTestId("founderview-out").textContent();
  expect(txt, "no raw <script> from run_id").not.toContain("<script>");
  expect(txt, "markup escaped in DOM").toContain("&lt;script&gt;");
  expect(txt, "command-center section present").toContain("COMMAND CENTER");
  expect(txt, "console section present").toContain("LIVE RUN CONSOLE");
  // command-center escRnId strips the injected newline to a space, so the whole hostile
  // run_id stays on ONE line (MARK-READY not pushed to a new line) and markup is escaped.
  expect(txt, "injected newline stripped; run_id inert & single-line").toContain("run=run-&lt;script&gt;alert(1)&lt;/script&gt; MARK-READY");
  await page.screenshot({ path: join(SHOTS, `founder-view.${info.project.name}.png`), fullPage: true });
  const a = await new AxeBuilder({ page }).analyze();
  writeFileSync(join(A11Y, `founder-view.${info.project.name}.a11y.json`),
    JSON.stringify({ browser: info.project.name, violations: a.violations.length, passes: a.passes.length }, null, 2));
  console.log(`[a11y] founder-view/${info.project.name}: ${a.violations.length} violation(s)`);
  const serious = a.violations.filter(v => v.impact === "serious" || v.impact === "critical");
  expect(serious, `serious/critical a11y: ${JSON.stringify(serious.map(v=>v.id))}`).toHaveLength(0);
  expect(a.violations, `a11y violations: ${JSON.stringify(a.violations.map(v=>v.id))}`).toHaveLength(0);
});
