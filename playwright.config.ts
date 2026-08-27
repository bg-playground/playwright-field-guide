import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './examples/executable',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    trace: 'on-first-retry',
  },
});
