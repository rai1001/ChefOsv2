import { test, expect } from '@playwright/test'
import { requireEnv } from './_helpers/env'

const TEST_EMAIL = requireEnv('E2E_EMAIL')
const TEST_PASSWORD = requireEnv('E2E_PASSWORD')

/**
 * Smoke test — verifica que la app arranca, login funciona, dashboard carga,
 * y que los fixes /qa de hoy siguen vivos en producción:
 *   - ISSUE-001: escandallo live actualiza "hace Ns" con setInterval
 *   - ISSUE-005: /events/[id] (que importa el wrapper BEO) renderiza sin crash
 *
 * Para ejecutar: levantar dev server (npm run dev) y luego `npm run test:e2e`
 */

test.describe('Smoke — login + rutas críticas', () => {
  test('login → dashboard carga', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()

    await page.waitForURL(/\/dashboard/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // No console errors
    const errors: string[] = []
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
    await page.waitForTimeout(500)
    expect(errors, `Console errors en /dashboard:\n${errors.join('\n')}`).toHaveLength(0)
  })

  test('regresión ISSUE-001: escandallo live muestra "Actualizado hace Ns" y el contador avanza', async ({ page }) => {
    // Login primero
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/dashboard/)

    // Ir a recipes, coger la primera receta, abrir escandallo
    await page.goto('/recipes')
    const firstRecipeLink = page.locator('a[href^="/recipes/"]').filter({ hasNotText: 'Nueva' }).first()
    await firstRecipeLink.click()
    await page.waitForURL(/\/recipes\/[0-9a-f-]+$/)

    // Abrir escandallo (puede ser botón o tab)
    await page.goto(page.url() + '/escandallo')

    // Esperar a que se pinte "Actualizado hace Ns" (el setInterval del fix)
    const agoLocator = page.getByText(/Actualizado hace \d+s/i)
    await expect(agoLocator).toBeVisible({ timeout: 10_000 })

    // Capturar valor inicial y esperar 3s — el contador debe haber avanzado
    const initial = await agoLocator.textContent()
    const initialSec = Number(initial?.match(/(\d+)s/)?.[1] ?? 0)
    await page.waitForTimeout(3_000)
    const after = await agoLocator.textContent()
    const afterSec = Number(after?.match(/(\d+)s/)?.[1] ?? 0)

    expect(afterSec, `El contador debe avanzar en vivo (${initial} → ${after})`).toBeGreaterThan(initialSec)
  })

  test('regresión ISSUE-005: /events/[id] renderiza (build + dynamic BEO wrapper)', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/dashboard/)

    await page.goto('/events')
    const firstEvent = page.locator('a[href^="/events/"]').filter({ hasNotText: 'Nuevo' }).first()
    await firstEvent.click()
    await page.waitForURL(/\/events\/[0-9a-f-]+$/)

    // Si la página rompiera por el bug de Turbopack el build no hubiera existido;
    // en dev se ve como 500 o como hidratación rota. Verificamos que el h1 renderiza.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const errors: string[] = []
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
    await page.waitForTimeout(1_000)
    // Ignorar errores conocidos de dev (HMR, devtools) — solo fallar si aparece algo de react-pdf
    const pdfErrors = errors.filter((e) => /react-pdf|ModuleId not found/i.test(e))
    expect(pdfErrors, `Errores relacionados con @react-pdf/renderer:\n${pdfErrors.join('\n')}`).toHaveLength(0)
  })
})
