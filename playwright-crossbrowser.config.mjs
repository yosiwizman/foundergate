// Wave-1B cross-browser config (separate from the reviewed playwright-l3.config.mjs).
// Runs the L3 visual specs + the founder-view spec across chromium/firefox/webkit.
import { defineConfig, devices } from "@playwright/test";
const PORT = Number(process.env.L3_PORT || 4713);
export default defineConfig({
  testDir: "./tests/e2e-l3-visual", timeout: 30000, retries: 0,
  reporter: [["list"], ["json", { outputFile: process.env.L3_REPORT || "l3-xb-results.json" }]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, screenshot: "on" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: { command: `L3_PORT=${PORT} node visual-fixtures/server.mjs`, url: `http://127.0.0.1:${PORT}/visual-fixtures/dashboard.html`, reuseExistingServer: false, timeout: 20000 },
});
