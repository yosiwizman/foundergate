import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SHOTS = process.env.FUX_SHOTS || 'fux_shots';
const A11Y = process.env.FUX_A11Y || 'fux_a11y';

async function a11y(page, key) {
  const a = await new AxeBuilder({ page }).analyze();
  const serious = a.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  writeFileSync(join(A11Y, `${key}.a11y.json`), JSON.stringify({ page: key, violations: a.violations.length, serious: serious.length }, null, 2));
  expect(serious).toHaveLength(0);
}

test('founder dashboard: Start + Export wired (LOCAL_SIMULATION)', async ({ page }) => {
  await page.goto('/demo/founder_operator_dashboard/index.html');
  await expect(page.getByTestId('banner')).toContainText('LOCAL_SIMULATION');
  await expect(page.getByTestId('main')).toBeVisible();
  // export disabled before a run
  await expect(page.getByTestId('export-btn')).toBeDisabled();
  // Start
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('start-status')).toContainText('LOCAL_SIMULATION');
  await expect(page.getByTestId('status-val')).toContainText('COMPLETE_SIMULATED');
  await expect(page.getByTestId('commit-val')).toContainText('547de734');
  await expect(page.getByTestId('decision-val')).toContainText('INTERNAL_DEMO_ONLY');
  await expect(page.getByTestId('decision-val')).not.toContainText('SHIP —'); // never a bare SHIP
  // Export now enabled
  await expect(page.getByTestId('export-btn')).toBeEnabled();
  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-status')).toContainText('LOCAL_EXPORT');
  await page.screenshot({ path: join(SHOTS, 'founder_dashboard_run.png'), fullPage: true });
  await a11y(page, 'founder_dashboard');
});

test('founder dashboard: empty objective -> INSUFFICIENT (honest)', async ({ page }) => {
  await page.goto('/demo/founder_operator_dashboard/index.html');
  await page.getByTestId('objective').fill('');
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('decision-val')).toContainText('INSUFFICIENT');
});

test('reviewer console: bound to real sealed-package index (read-only)', async ({ page }) => {
  await page.goto('/demo/reviewer_console/index.html');
  await expect(page.getByTestId('banner')).toContainText('REAL SEALED-PACKAGE INDEX');
  const count = await page.getByTestId('pkg-count').textContent();
  expect(Number(count)).toBeGreaterThan(0);
  const rows = await page.getByTestId('pkg-rows').locator('tr').count();
  expect(rows).toBeGreaterThan(0);
  await page.screenshot({ path: join(SHOTS, 'reviewer_console.png'), fullPage: true });
  await a11y(page, 'reviewer_console');
});
