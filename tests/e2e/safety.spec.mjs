import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("initial neutral state has no completed result", async ({ page }) => {
  await expect(page.locator("#neutral-card")).toBeVisible();
  await expect(page.locator("#result-grid")).toBeHidden();
  await expect(page.locator("#run-card")).toBeHidden();
});

test("fixture button binds the fixture URL", async ({ page }) => {
  await page.click("#fixture-btn");
  await expect(page.locator("#url")).toHaveValue("https://github.com/pypa/sampleproject");
});

test("Run creates a new run id, shows stages, result bound to run and repository", async ({ page }) => {
  await page.click("#fixture-btn");
  await page.click("#run");
  await expect(page.locator("#run-card")).toBeVisible();
  const runId = await page.locator("#run-id").textContent();
  expect(runId).toMatch(/^sc-/);
  // result grid appears with the run's evidence (CI-fixture completes fast)
  await expect(page.locator("#result-grid")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#commit")).toContainText("621e4974");
  await expect(page.locator("#r-repo")).toContainText("pypa/sampleproject");
  await expect(page.locator("#run-when")).toContainText(runId.trim());
  await expect(page.locator("#result")).toContainText("Source parsing observed");
});

test("build/tests/security/production remain not proven", async ({ page }) => {
  for (const t of ["Build not proven","Tests not proven","Security not proven","Production readiness not proven"]) {
    await expect(page.locator(".badge-amber", { hasText: t })).toHaveCount(1);
  }
});

test("evidence pack becomes available and download link is set", async ({ page }) => {
  await page.click("#fixture-btn"); await page.click("#run");
  await expect(page.locator("#pack-dl")).toBeVisible({ timeout: 15000 });
  const href = await page.locator("#pack-dl").getAttribute("href");
  expect(href).toMatch(/\/api\/runs\/sc-.*\/evidence-pack/);
});

test("another public URL is HELD", async ({ page }) => {
  await page.fill("#url", "https://github.com/torvalds/linux");
  await page.click("#run");
  await expect(page.locator("#refusal")).toContainText("HELD");
});

test("SSH URL is refused", async ({ page }) => {
  await page.fill("#url", "git@github.com:a/b.git");
  await page.click("#run");
  await expect(page.locator("#refusal")).toContainText("Refused");
});

test("Pause & get help is visible and states honest power", async ({ page }) => {
  await expect(page.locator("#pause")).toBeVisible();
  await page.click("#pause");
  await expect(page.locator("#pause-msg")).toContainText("cancellation is not yet proven");
});

test("no raw terminal command is founder-facing", async ({ page }) => {
  const body = await page.locator("body").textContent();
  expect(body).not.toMatch(/node src\/|localhost:|127\.0\.0\.1:|\$ /);
});

test("axe: no critical or serious accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => ["critical", "serious"].includes(v.impact));
  expect(bad, JSON.stringify(bad.map((v) => v.id))).toEqual([]);
});
