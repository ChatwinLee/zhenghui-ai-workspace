import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:5180",
    channel: "chrome",
    headless: true,
    viewport: { width: 1512, height: 982 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run dev",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: true,
    timeout: 20000,
  },
  reporter: "list",
});
