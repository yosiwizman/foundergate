// L3-only Playwright config (separate from the repo's playwright.config.mjs — the CI
// config is NOT touched). Runs the L3 visual spec against a tiny loopback static server.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.L3_PORT || 4713);

export default defineConfig({
  testDir: "./tests/e2e-l3-visual",
  timeout: 30000,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: process.env.L3_REPORT || "l3-playwright-results.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    screenshot: "on",
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `L3_PORT=${PORT} node visual-fixtures/server.mjs`,
    url: `http://127.0.0.1:${PORT}/visual-fixtures/dashboard.html`,
    reuseExistingServer: false,
    timeout: 20000,
  },
});
