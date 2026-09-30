import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3017",
    trace: "retain-on-failure",
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
          },
        }
      : {}),
    ...(process.env.PLAYWRIGHT_CHROME === "1" ? { channel: "chrome" } : {}),
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          process.env.PLAYWRIGHT_PRODUCTION === "1"
            ? "npm run build && PORT=3017 HOSTNAME=127.0.0.1 node .next/standalone/server.js"
            : "NEXT_PUBLIC_APP_URL=https://parispulse.ca NEXT_PUBLIC_PARIS_PULSE_TEST_MODE=1 PARIS_PULSE_TEST_MODE=1 PARIS_PULSE_RELATIVE_FIXTURES=1 npm run dev -- --hostname 127.0.0.1 --port 3017",
        url: "http://127.0.0.1:3017",
        reuseExistingServer: !process.env.CI,
        timeout: process.env.PLAYWRIGHT_PRODUCTION === "1" ? 240000 : 120000,
      },
});
