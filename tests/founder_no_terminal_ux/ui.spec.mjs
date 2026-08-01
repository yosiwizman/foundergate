import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SHOTS = process.env.FUX_SHOTS || 'fux_shots';
const A11Y = process.env.FUX_A11Y || 'fux_a11y';
async function a11y(page, key){ const a=await new AxeBuilder({page}).analyze(); const s=a.violations.filter(v=>v.impact==='serious'||v.impact==='critical'); writeFileSync(join(A11Y,`${key}.a11y.json`),JSON.stringify({page:key,violations:a.violations.length,serious:s.length},null,2)); expect(s).toHaveLength(0); }

test('founder dashboard: Start loads REAL_LOCAL_RUN (real commit + real tests)', async ({ page }) => {
  await page.goto('/demo/founder_operator_dashboard/index.html');
  await expect(page.getByTestId('banner')).toContainText('REAL_LOCAL_RUN via CLI');
  await expect(page.getByTestId('export-btn')).toBeDisabled();
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('start-status')).toContainText('REAL_LOCAL_RUN', { timeout: 5000 });
  await expect(page.getByTestId('status-val')).toContainText('REAL_LOCAL_RUN');
  await expect(page.getByTestId('commit-val')).toContainText('90f49fdcd408'); // REAL head SHA
  await expect(page.getByTestId('decision-val')).toContainText('INTERNAL_DEMO_ONLY');
  await expect(page.getByTestId('export-btn')).toBeEnabled();
  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-status')).toContainText('REAL sealed ZIP');
  await page.screenshot({ path: join(SHOTS,'founder_dashboard_real_run.png'), fullPage: true });
  await a11y(page, 'founder_dashboard');
});

test('reviewer console: bound to real sealed-package index (read-only)', async ({ page }) => {
  await page.goto('/demo/reviewer_console/index.html');
  await expect(page.getByTestId('banner')).toContainText('REAL SEALED-PACKAGE INDEX');
  const count = await page.getByTestId('pkg-count').textContent();
  expect(Number(count)).toBeGreaterThan(0);
  await page.screenshot({ path: join(SHOTS,'reviewer_console.png'), fullPage: true });
  await a11y(page, 'reviewer_console');
});
