// Live-wired E2E: hit the REAL local server (server-side render from real modules).
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const SHOTS = process.env.LIVE_SHOTS, A11Y = process.env.LIVE_A11Y;
mkdirSync(SHOTS, { recursive: true }); mkdirSync(A11Y, { recursive: true });
test("live server renders composed founder-view from real modules (honest state + inert run_id)", async ({ page }, info) => {
  await page.goto("/", { waitUntil: "load" });
  const txt = await page.getByTestId("live-founderview-out").textContent();
  // real module composition -> sections present
  expect(txt, "status cards").toContain("STATUS CARDS");
  expect(txt, "command center").toContain("COMMAND CENTER");
  expect(txt, "live run console").toContain("LIVE RUN CONSOLE");
  // honest UNKNOWN for signals not supplied (url/decision/presence/safety)
  expect(txt, "UNKNOWN shown for missing signals").toContain("UNKNOWN");
  expect(txt, "unknowns enumerated").toMatch(/UNKNOWNS \([1-9]/);
  // hostile run_id inert in the LIVE DOM
  expect(txt, "no raw <script> from run_id").not.toContain("<script>");
  expect(txt, "markup escaped in live DOM").toContain("&lt;script&gt;");
  expect(txt, "injected newline stripped; run_id single-line").toContain("run=run-&lt;script&gt;alert(1)&lt;/script&gt; MARK-READY");
  // no fabricated ready/ship/merge state
  expect(/\b(READY_FOR_MERGE|SHIP\b|MERGE-READY|PRODUCTION-READY)\b/i.test(txt), "no fabricated ready/ship/merge").toBeFalsy();
  await page.screenshot({ path: join(SHOTS, `live-founder-view.${info.project.name}.png`), fullPage: true });
  const a = await new AxeBuilder({ page }).analyze();
  writeFileSync(join(A11Y, `live-founder-view.${info.project.name}.a11y.json`), JSON.stringify({ browser: info.project.name, violations: a.violations.length, passes: a.passes.length }, null, 2));
  console.log(`[a11y] live/${info.project.name}: ${a.violations.length} violation(s)`);
  const serious = a.violations.filter(v => v.impact === "serious" || v.impact === "critical");
  expect(serious).toHaveLength(0);
  expect(a.violations).toHaveLength(0);
});
