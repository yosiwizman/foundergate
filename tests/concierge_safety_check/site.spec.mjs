import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SHOTS = process.env.CON_SHOTS || 'con_shots';
const A11Y = process.env.CON_A11Y || 'con_a11y';
const BANNER = 'INTERNAL DEMO ONLY';
const pages = ['index','process','sample-report','data-rules','offer','faq'];
for (const p of pages) {
  test(`concierge ${p} renders + a11y + labels`, async ({ page }) => {
    await page.goto(`/demo/concierge_safety_check/site/${p}.html`);
    await expect(page.getByTestId('banner')).toContainText(BANNER);
    await expect(page.getByTestId('main')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, `${p}.png`), fullPage: true });
    const a = await new AxeBuilder({ page }).analyze();
    writeFileSync(join(A11Y, `${p}.a11y.json`), JSON.stringify({page:p,violations:a.violations.length,serious:a.violations.filter(v=>v.impact==='serious'||v.impact==='critical').length},null,2));
    expect(a.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toHaveLength(0);
  });
}
