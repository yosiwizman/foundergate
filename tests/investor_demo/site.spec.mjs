import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs"; import { join } from "node:path";
const SHOTS = process.env.INV_SHOTS, A11Y = process.env.INV_A11Y;
mkdirSync(SHOTS,{recursive:true}); mkdirSync(A11Y,{recursive:true});
const PAGES = ["index","evidence","internal-beta","design-partner","claims","limitations"];
for (const p of PAGES) {
  test(`investor-demo ${p} renders + a11y + labels`, async ({ page }, info) => {
    await page.goto(`/demo/investor_demo/${p}.html`, { waitUntil: "load" });
    await expect(page.getByTestId("banner")).toContainText("INTERNAL DEMO ONLY");
    await expect(page.getByTestId("main")).toBeVisible();
    await page.screenshot({ path: join(SHOTS, `${p}.png`), fullPage: true });
    const a = await new AxeBuilder({ page }).analyze();
    writeFileSync(join(A11Y, `${p}.a11y.json`), JSON.stringify({page:p,violations:a.violations.length},null,2));
    expect(a.violations.filter(v=>v.impact==="serious"||v.impact==="critical")).toHaveLength(0);
  });
}
