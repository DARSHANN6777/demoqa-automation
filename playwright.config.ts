import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  timeout: 60000,
  
  expect: {
    timeout: 10000,
  },
  
  use: {
    baseURL: 'https://demoqa.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
  {
    name: 'chromium',
    use: { 
      ...devices['Desktop Chrome'],
      headless: false,  // Set to true for headless mode
      launchOptions: {
        slowMo: 500,    // Slow down for better visibility
      },
    },
  },
 ],
});