import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3017",
    trace: "retain-on-failure",
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
        command: "NEXT_PUBLIC_PARIS_PULSE_TEST_MODE=1 PARIS_PULSE_TEST_MODE=1 npm run dev -- --port 3017",
        url: "http://localhost:3017",
        reuseExistingServer: true,
        timeout: 120000,
      },
});
