import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SHOTS = process.env.E2E_SHOTS || 'e2e_shots';
const A11Y = process.env.E2E_A11Y || 'e2e_a11y';
async function a11y(page, key){ const a=await new AxeBuilder({page}).analyze(); const s=a.violations.filter(v=>v.impact==='serious'||v.impact==='critical'); writeFileSync(join(A11Y,`${key}.a11y.json`),JSON.stringify({page:key,violations:a.violations.length,serious:s.length},null,2)); expect(s).toHaveLength(0); }

test('E2E: browser Start -> server -> real run -> Export -> sealed package', async ({ page }) => {
  await page.goto('/demo/founder_operator_dashboard/index.html');
  await expect(page.getByTestId('banner')).toContainText('LOOPBACK RUN-SERVER');
  await expect(page.getByTestId('export-btn')).toBeDisabled();
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('start-status')).toContainText('COMPLETE', { timeout: 15000 });
  await expect(page.getByTestId('status-val')).toContainText('REAL_LOCAL_RUN');
  await expect(page.getByTestId('commit-val')).toHaveText(/^[0-9a-f]{12}$/); // real HEAD
  await expect(page.getByTestId('decision-val')).toContainText('INTERNAL_DEMO_ONLY');
  await expect(page.getByTestId('decision-val')).not.toContainText('SHIP —');
  await expect(page.getByTestId('export-btn')).toBeEnabled();
  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-status')).toContainText('SEALED_EXPORT_LOCAL', { timeout: 15000 });
  await page.screenshot({ path: join(SHOTS,'e2e_dashboard_real_run.png'), fullPage: true });
  await a11y(page, 'founder_dashboard');
});

test('E2E: empty objective -> INSUFFICIENT (honest refusal)', async ({ page }) => {
  await page.goto('/demo/founder_operator_dashboard/index.html');
  await page.getByTestId('objective').fill('');
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('start-status')).toContainText('INSUFFICIENT', { timeout: 10000 });
});

test('E2E: reviewer drawer opens real sealed-package contents (read-only)', async ({ page }) => {
  await page.goto('/demo/reviewer_console/index.html');
  await expect(page.getByTestId('banner')).toContainText('OPENABLE CONTENTS');
  const detailCount = await page.getByTestId('detail-count').textContent();
  expect(Number(detailCount)).toBeGreaterThan(0);
  const drawers = page.getByTestId('pkg-drawer');
  await expect(drawers.first()).toBeVisible();
  await drawers.first().locator('summary').click();
  await expect(drawers.first()).toContainText('SHA-256');
  await expect(drawers.first()).toContainText('Manifest');
  await page.screenshot({ path: join(SHOTS,'e2e_reviewer_drawer.png'), fullPage: true });
  await a11y(page, 'reviewer_console');
});
