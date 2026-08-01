import { defineConfig, devices } from "@playwright/test";
const PORT = Number(process.env.INV_PORT || 4831);
export default defineConfig({ testDir: "./tests/investor_demo", timeout: 30000, retries: 0,
  reporter: [["list"],["json",{outputFile: process.env.INV_REPORT || "inv-results.json"}]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, screenshot: "on" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: `L3_PORT=${PORT} node visual-fixtures/server.mjs`, url: `http://127.0.0.1:${PORT}/visual-fixtures/dashboard.html`, reuseExistingServer:false, timeout:20000 } });
