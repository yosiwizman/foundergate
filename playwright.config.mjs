import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  retries: 0,
  reporter: [["html", { outputFolder: "docs/testing/evidence/playwright-report", open: "never" }], ["json", { outputFile: "docs/testing/evidence/playwright-results.json" }]],
  use: { baseURL: "http://127.0.0.1:4711", trace: "on", screenshot: "on", video: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "FG_UI_CI=1 FG_SAFETY_PORT=4711 FG_SAFETY_RUNS_DIR=/tmp/pw-safety-runs node src/safety_check/service.mjs",
    url: "http://127.0.0.1:4711/api/health",
    reuseExistingServer: false,
    timeout: 20000,
  },
});
