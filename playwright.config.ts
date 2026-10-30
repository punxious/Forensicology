import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests run against a production build with throwaway secrets.
 * `pnpm test:e2e` builds and starts the app automatically.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Software WebGL so the 3D scenes render in headless CI.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/cases`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      ANSWER_PEPPER: "e2e-pepper-not-secret-0123456789abcdef0123",
      RUN_TOKEN_SECRET: "e2e-run-secret-not-secret-0123456789abcdef",
    },
  },
});
