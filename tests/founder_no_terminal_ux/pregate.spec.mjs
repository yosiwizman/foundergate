import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SHOTS = process.env.PG_SHOTS || 'pg_shots';
const A11Y = process.env.PG_A11Y || 'pg_a11y';
async function a11y(page, key){ const a=await new AxeBuilder({page}).analyze(); const s=a.violations.filter(v=>v.impact==='serious'||v.impact==='critical'); writeFileSync(join(A11Y,`${key}.a11y.json`),JSON.stringify({page:key,violations:a.violations.length,serious:s.length},null,2)); expect(s).toHaveLength(0); }

test('Decision Room: review-only, all 8 gate cards, no action', async ({ page }) => {
  await page.goto('/demo/founder_decision_room/index.html');
  await expect(page.getByTestId('banner')).toContainText('REVIEW ONLY');
  await expect(page.getByTestId('banner')).toContainText('NO BUTTON ACTS');
  await expect(page.getByTestId('main')).toBeVisible();
  const nas = page.getByTestId('no-action');
  await expect(nas).toHaveCount(8);
  // there are no buttons/forms on this page
  expect(await page.locator('button').count()).toBe(0);
  expect(await page.locator('form').count()).toBe(0);
  await page.screenshot({ path: join(SHOTS,'decision_room.png'), fullPage: true });
  await a11y(page, 'decision_room');
});

test('Founder witness dashboard: authed real run (dry-run validation)', async ({ page }) => {
  await page.goto('/demo/founder_operator_dashboard/index.html');
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('start-status')).toContainText('COMPLETE', { timeout: 15000 });
  await expect(page.getByTestId('commit-val')).toHaveText(/^[0-9a-f]{12}$/);
  await expect(page.getByTestId('decision-val')).toContainText('INTERNAL_DEMO_ONLY');
  await page.getByTestId('export-btn').click();
  await expect(page.getByTestId('export-status')).toContainText('SEALED_EXPORT_LOCAL', { timeout: 15000 });
  await page.screenshot({ path: join(SHOTS,'witness_dashboard.png'), fullPage: true });
  await a11y(page, 'witness_dashboard');
});
