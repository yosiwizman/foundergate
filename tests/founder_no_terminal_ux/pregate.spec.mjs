import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const SHOTS = process.env.PG_SHOTS || 'pg_shots';
const A11Y = process.env.PG_A11Y || 'pg_a11y';
async function a11y(page,key){ const a=await new AxeBuilder({page}).analyze(); const s=a.violations.filter(v=>v.impact==='serious'||v.impact==='critical'); writeFileSync(join(A11Y,`${key}.a11y.json`),JSON.stringify({page:key,violations:a.violations.length,serious:s.length},null,2)); expect(s).toHaveLength(0); }
test('Decision Room: recommendation panel + review-only', async ({ page }) => {
  await page.goto('/demo/founder_decision_room/index.html');
  await expect(page.getByTestId('recommendation')).toContainText('Recommended next gate');
  await expect(page.getByTestId('recommendation')).toContainText('Publish');
  expect(await page.locator('button').count()).toBe(0);
  expect(await page.locator('form').count()).toBe(0);
  await expect(page.getByTestId('no-action').first()).toContainText('NO ACTION');
  await page.screenshot({ path: join(SHOTS,'decision_room_v2.png'), fullPage: true });
  await a11y(page,'decision_room');
});
test('Dashboard: corrected copy + real run', async ({ page }) => {
  await page.goto('/demo/founder_operator_dashboard/index.html');
  await expect(page.locator('body')).toContainText('runs a real local check on a self-owned demo project');
  await expect(page.locator('body')).not.toContainText('work locally via LOCAL_SIMULATION');
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('start-status')).toContainText('COMPLETE', { timeout: 15000 });
  await expect(page.getByTestId('decision-val')).toContainText('INTERNAL_DEMO_ONLY');
  await page.screenshot({ path: join(SHOTS,'dashboard_v2.png'), fullPage: true });
  await a11y(page,'dashboard');
});
test('Reviewer: founder-summary layer + read-only', async ({ page }) => {
  await page.goto('/demo/reviewer_console/index.html');
  await expect(page.getByTestId('founder-summary')).toContainText('For the founder');
  expect(await page.locator('button').count()).toBe(0);
  const c = await page.getByTestId('pkg-count').textContent(); expect(Number(c)).toBeGreaterThan(0);
  await page.screenshot({ path: join(SHOTS,'reviewer_v2.png'), fullPage: true });
  await a11y(page,'reviewer_console');
});
