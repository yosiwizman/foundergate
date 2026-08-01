import { defineConfig, devices } from '@playwright/test';
const PORT = process.env.CON_PORT || 4841;
export default defineConfig({
  testDir: './tests/concierge_safety_check',
  reporter: [['json', { outputFile: process.env.CON_REPORT || 'con_report.json' }], ['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: `L3_PORT=${PORT} node visual-fixtures/server.mjs`, url: `http://127.0.0.1:${PORT}/demo/concierge_safety_check/site/index.html`, reuseExistingServer: false, timeout: 30000 },
});
