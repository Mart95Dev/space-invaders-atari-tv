import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:7101',
    ...devices['Desktop Chrome'],
    // Utilise Google Chrome déjà installé (aucun navigateur à télécharger).
    channel: 'chrome',
  },
  webServer: {
    command: 'npm run dev -- --port 7101 --strictPort',
    url: 'http://localhost:7101',
    reuseExistingServer: false,
  },
});
