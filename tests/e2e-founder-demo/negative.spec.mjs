import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
const SHOTS=process.env.FD_SHOTS, A11Y=process.env.FD_A11Y; mkdirSync(SHOTS,{recursive:true}); mkdirSync(A11Y,{recursive:true});
test("cannot-invent-state: missing inputs render UNKNOWN, never LIVE, a11y clean", async ({ page }) => {
  await page.goto("/visual-fixtures/founder-demo/negative.html",{waitUntil:"load"});
  await page.waitForFunction(()=>window.__READY===true,null,{timeout:10000});
  const txt = await page.getByTestId("neg-out").textContent();
  expect(txt).toContain("UNKNOWN");                 // honest unknown surfaced
  expect(txt).not.toContain("liveness=LIVE");        // never LIVE without a heartbeat
  expect(txt.toLowerCase()).not.toContain("production-ready");
  await page.screenshot({ path:`${SHOTS}/negative.png`, fullPage:true });
  const a = await new AxeBuilder({ page }).analyze();
  writeFileSync(`${A11Y}/negative.a11y.json`, JSON.stringify({violations:a.violations.length,ids:a.violations.map(v=>v.id)},null,2));
  expect(a.violations,`a11y: ${JSON.stringify(a.violations.map(v=>v.id))}`).toHaveLength(0);
});
