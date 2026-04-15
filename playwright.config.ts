import { defineConfig, devices } from '@playwright/test'

// Puerto del dev server. ChefOS corre en 3003 según el preview
// (ver .claude/launch.json). Cambiar si se lanza en otro puerto.
const PORT = Number(process.env.E2E_PORT ?? 3003)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // login compartido → serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // NO arrancamos webServer desde Playwright — asumimos dev server ya corriendo
  // (es el patrón de Israel con el Claude Preview). Si se quiere auto-start:
  //   webServer: { command: 'npm run dev', url: BASE_URL, reuseExistingServer: !process.env.CI }
})
