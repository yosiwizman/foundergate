import { defineConfig, devices } from '@playwright/test';
const PORT = process.env.FUX_PORT || 4873;
export default defineConfig({
  testDir: './tests/founder_no_terminal_ux',
  testMatch: 'ui.spec.mjs',
  reporter: [['json', { outputFile: process.env.FUX_REPORT || 'fux_report.json' }], ['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: `L3_PORT=${PORT} node visual-fixtures/server.mjs`, url: `http://127.0.0.1:${PORT}/demo/founder_operator_dashboard/index.html`, reuseExistingServer: false, timeout: 30000 },
});
