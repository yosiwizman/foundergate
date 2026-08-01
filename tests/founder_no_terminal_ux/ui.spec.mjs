import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SHOTS = process.env.FUX_SHOTS || 'fux_shots';
const A11Y = process.env.FUX_A11Y || 'fux_a11y';
const pages = [
  { key: 'founder_dashboard', url: '/demo/founder_operator_dashboard/index.html', banner: 'LOCAL PROTOTYPE' },
  { key: 'reviewer_console', url: '/demo/reviewer_console/index.html', banner: 'READ-ONLY REVIEWER' },
  { key: 'saas_shell', url: '/demo/saas_foundation_shell/index.html', banner: 'NON-PRODUCTION SHELL' },
];
for (const p of pages) {
  test(`${p.key} renders + a11y + labels`, async ({ page }) => {
    await page.goto(p.url);
    await expect(page.getByTestId('banner')).toContainText(p.banner);
    await expect(page.getByTestId('main')).toBeVisible();
    await page.screenshot({ path: join(SHOTS, `${p.key}.png`), fullPage: true });
    const a = await new AxeBuilder({ page }).analyze();
    const serious = a.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    writeFileSync(join(A11Y, `${p.key}.a11y.json`), JSON.stringify({ page: p.key, violations: a.violations.length, serious: serious.length }, null, 2));
    expect(serious).toHaveLength(0);
  });
}
