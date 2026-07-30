import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");           // worktree root
const PORT = Number(process.env.FD_PORT || 4715);
export default defineConfig({
  testDir: ".", timeout: 30000, retries: 0,
  reporter: [["list"], ["json", { outputFile: process.env.FD_REPORT || "fd-results.json" }]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, screenshot: "on" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `L3_PORT=${PORT} node visual-fixtures/server.mjs`,
    cwd: ROOT,
    url: `http://127.0.0.1:${PORT}/visual-fixtures/founder-demo/demo.html`,
    reuseExistingServer: false, timeout: 20000,
  },
});
