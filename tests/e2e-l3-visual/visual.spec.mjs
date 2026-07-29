// L3 visual/browser qualification spec — renders each Level 2 view-model in a real
// (headless chromium) browser, asserts the rendered DOM text, captures a screenshot,
// and runs an @axe-core/playwright accessibility scan. Results are written to the L3
// evidence dir (paths passed via env). Local-only; no provider/network beyond loopback.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SHOTS = process.env.L3_SHOTS;
const A11Y = process.env.L3_A11Y;
mkdirSync(SHOTS, { recursive: true });
mkdirSync(A11Y, { recursive: true });

const PAGES = [
  { name: "dashboard", path: "/visual-fixtures/dashboard.html", testid: "dashboard-out",
    include: ["FOUNDER COMMAND CENTER", "run=run-L3", "liveness=LIVE", "heartbeat_age=30s"], exclude: [] },
  { name: "drawer", path: "/visual-fixtures/drawer.html", testid: "drawer-out",
    include: ["verdict: COMPILEABILITY_OBSERVED", "‹REDACTED: SECRET›", "‹REDACTED: BLOCKED›", "linked: yes"],
    exclude: ["sk-live-SHOULD-NEVER-APPEAR", "/Users/private/store"] },
  { name: "console", path: "/visual-fixtures/console.html", testid: "console-out",
    include: ["Live Run Console", "liveness=STALE", "CONFLICT: STALE_WHILE_RUNNING", "current=2"], exclude: ["liveness=LIVE"] },
];

for (const p of PAGES) {
  test(`renders ${p.name} in a real browser (visual + a11y)`, async ({ page }) => {
    await page.goto(p.path, { waitUntil: "load" });
    await page.waitForFunction(() => window.__L3_READY === true, null, { timeout: 10000 });
    const txt = await page.getByTestId(p.testid).textContent();
    for (const s of p.include) expect(txt, `${p.name} should render "${s}"`).toContain(s);
    for (const s of p.exclude) expect(txt, `${p.name} must NEVER render "${s}"`).not.toContain(s);

    await page.screenshot({ path: join(SHOTS, `${p.name}.png`), fullPage: true });

    const a = await new AxeBuilder({ page }).analyze();
    const summary = {
      page: p.name, url: p.path, violations: a.violations.length,
      violation_ids: a.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      passes: a.passes.length, incomplete: a.incomplete.length,
    };
    writeFileSync(join(A11Y, `${p.name}.a11y.json`), JSON.stringify(summary, null, 2));
    console.log(`[a11y] ${p.name}: ${a.violations.length} violation(s), ${a.passes.length} pass check(s)`);
    // Fixtures are semantic (lang, title, one <main> landmark). Require ZERO axe
    // violations at any impact, and specifically zero serious/critical.
    const serious = a.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, `serious/critical a11y violations on ${p.name}: ${JSON.stringify(serious.map((v) => v.id))}`).toHaveLength(0);
    expect(a.violations, `a11y violations on ${p.name}: ${JSON.stringify(a.violations.map((v) => v.id))}`).toHaveLength(0);
  });
}

// Sanity: confirm the fixture actually loaded a real ES module (no 404 fallthrough / MIME error).
test("component modules load as ES modules (no 404 fallthrough)", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/visual-fixtures/dashboard.html", { waitUntil: "load" });
  await page.waitForFunction(() => window.__L3_READY === true, null, { timeout: 10000 });
  expect(errors, `page/module errors: ${errors.join(" | ")}`).toHaveLength(0);
});
