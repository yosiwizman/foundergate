import { defineConfig, devices } from '@playwright/test';
const PORT = process.env.OP_PORT || 4893;
export default defineConfig({
  testDir: './tests/founder_no_terminal_ux', testMatch: 'pregate.spec.mjs',
  reporter: [['json', { outputFile: process.env.PG_REPORT || 'pg_report.json' }], ['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: `OP_PORT=${PORT} node src/operator_console/run-server.mjs`, url: `http://127.0.0.1:${PORT}/api/health`, reuseExistingServer: false, timeout: 30000 },
});
