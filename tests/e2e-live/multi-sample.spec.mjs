// Multi-sample live E2E: exercise the honest founder-facing flow across deterministic
// states against the REAL local server. Proves no invented state, honest UNKNOWN/STALE/
// INSUFFICIENT/DO_NOT_SHIP, hostile input inert, no fabricated READY/SHIP/MERGE.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const SHOTS = process.env.LIVE_SHOTS, A11Y = process.env.LIVE_A11Y;
mkdirSync(SHOTS, { recursive: true }); mkdirSync(A11Y, { recursive: true });
const FABRICATED = /(MERGE[_ ]?READY|FINAL[_ ]?BETA|PRODUCTION[_ ]?READY|CUSTOMER[_ ]?READY|READY TO MERGE|SHIP IT)/i;
// expected honest decision per state (from real-module composition)
const EXPECT = {
  review: { decision: "INSUFFICIENT EVIDENCE", must: ["STATUS CARDS", "LIVE RUN CONSOLE"] },
  missing: { decision: "INSUFFICIENT EVIDENCE", must: ["UNKNOWN"] },
  stale: { decision: "INSUFFICIENT EVIDENCE", must: ["STALE"] },
  failed: { decision: "DO NOT SHIP", must: ["COMMAND CENTER"] },
  insufficient: { decision: "INSUFFICIENT EVIDENCE|DO NOT SHIP", must: ["DECISION PACKAGE"] },
  hostile: { decision: "DO NOT SHIP", must: ["COMMAND CENTER"] },
};
test("flow index lists all honest states", async ({ page }, info) => {
  await page.goto("/flow", { waitUntil: "load" });
  for (const s of Object.keys(EXPECT)) await expect(page.getByTestId(`flow-link-${s}`)).toBeVisible();
  await page.screenshot({ path: join(SHOTS, `flow-index.${info.project.name}.png`), fullPage: true });
});
for (const [state, exp] of Object.entries(EXPECT)) {
  test(`state=${state} renders honest (${exp.decision}); no invented state; inert`, async ({ page }, info) => {
    await page.goto(`/?state=${state}`, { waitUntil: "load" });
    await expect(page.getByTestId("state-name")).toContainText(`state=${state}`);
    const txt = await page.getByTestId("live-out").textContent();
    for (const m of exp.must) expect(txt, `${state} should show ${m}`).toContain(m);
    expect(txt, `${state} honest decision`).toMatch(new RegExp(exp.decision));
    // no fabricated ready/ship/merge tokens
    expect(FABRICATED.test(txt), `${state} must not fabricate ready/ship/merge`).toBeFalsy();
    // no real script/img ELEMENT injected into the output container (hostile inert)
    const injected = await page.locator('[data-testid="live-out"] script, [data-testid="live-out"] img').count();
    expect(injected, `${state} no injected executable element`).toBe(0);
    if (state === "hostile") {
      expect(txt, "hostile markup escaped").toContain("&lt;");
      expect(txt, "hostile no raw <script> exec").not.toContain("<script>alert");
    }
    await page.screenshot({ path: join(SHOTS, `state-${state}.${info.project.name}.png`), fullPage: true });
    const a = await new AxeBuilder({ page }).analyze();
    writeFileSync(join(A11Y, `state-${state}.${info.project.name}.a11y.json`), JSON.stringify({ state, browser: info.project.name, violations: a.violations.length }, null, 2));
    const serious = a.violations.filter(v => v.impact === "serious" || v.impact === "critical");
    expect(serious).toHaveLength(0);
    expect(a.violations, `a11y ${state}`).toHaveLength(0);
  });
}
