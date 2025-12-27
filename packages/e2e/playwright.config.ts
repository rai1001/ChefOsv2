import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: [
    {
      command: 'npm run emulators',
      port: 4000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev --prefix ../web',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_USE_FIREBASE_EMULATOR: 'true',
        VITE_FIREBASE_API_KEY: 'AIzaSyC2Ne6AoEZlOa6glHtVki67CkJSbWey5Lg',
        VITE_FIREBASE_AUTH_DOMAIN: 'culinaryos-6794e.firebaseapp.com',
        VITE_FIREBASE_PROJECT_ID: 'culinaryos-6794e',
        VITE_FIREBASE_STORAGE_BUCKET: 'culinaryos-6794e.firebasestorage.app',
        VITE_FIREBASE_MESSAGING_SENDER_ID: '585939402630',
        VITE_FIREBASE_APP_ID: '1:585939402630:web:1bf233f537399bc466f607',
        VITE_FIREBASE_DATABASE_URL: 'http://127.0.0.1:9000?ns=chefosv2-default-rtdb',
      },
    },
  ],
});
