// Cross-browser config for the LIVE-WIRED path (separate from static-fixture configs).
import { defineConfig, devices } from "@playwright/test";
const PORT = Number(process.env.LIVE_PORT || 4820);
export default defineConfig({
  testDir: "./tests/e2e-live", timeout: 30000, retries: 0,
  reporter: [["list"], ["json", { outputFile: process.env.LIVE_REPORT || "live-results.json" }]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, screenshot: "on" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: { command: `LIVE_PORT=${PORT} node src/ui/founder-view/live/live-server.mjs`, url: `http://127.0.0.1:${PORT}/healthz`, reuseExistingServer: false, timeout: 20000 },
});
