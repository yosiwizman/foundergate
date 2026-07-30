import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const SHOTS = process.env.FD_SHOTS, A11Y = process.env.FD_A11Y;
mkdirSync(SHOTS, { recursive: true }); mkdirSync(A11Y, { recursive: true });
test("founder-demo renders end-to-end in a real browser (visual + a11y)", async ({ page }) => {
  await page.goto("/visual-fixtures/founder-demo/demo.html", { waitUntil: "load" });
  await page.waitForFunction(() => window.__READY === true, null, { timeout: 10000 });
  const txt = await page.getByTestId("demo-out").textContent();
  for (const s of ["URL", "COMPILEABILITY_OBSERVED"]) expect(txt).toContain(s);
  expect(txt.toLowerCase()).not.toContain("production-ready"); // never over-claim
  await page.screenshot({ path: `${SHOTS}/founder-demo.png`, fullPage: true });
  const a = await new AxeBuilder({ page }).analyze();
  writeFileSync(`${A11Y}/founder-demo.a11y.json`, JSON.stringify({ violations: a.violations.length, ids: a.violations.map(v=>v.id) }, null, 2));
  const serious = a.violations.filter(v => v.impact === "serious" || v.impact === "critical");
  expect(serious, `serious a11y: ${JSON.stringify(serious.map(v=>v.id))}`).toHaveLength(0);
  expect(a.violations, `a11y: ${JSON.stringify(a.violations.map(v=>v.id))}`).toHaveLength(0);
});
