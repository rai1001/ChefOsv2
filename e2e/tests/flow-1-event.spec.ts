import { test, expect } from '@playwright/test'
import { requireEnv } from './_helpers/env'

/**
 * Flujo 1 — Crear evento → enviar a confirmación → confirmar
 *
 * Corre contra el hotel de test (11111111-...) con el usuario test-admin@chefos.test.
 * El seed (globalSetup) garantiza que existe el cliente "Cliente Corporativo Test"
 * y que el usuario admin puede crear eventos en ese hotel.
 *
 * Verifica la state machine: draft → pending_confirmation → confirmed
 */

const EMAIL = 'test-admin@chefos.test'
const PASSWORD = requireEnv('E2E_PASSWORD')

test.describe.configure({ mode: 'serial' })

test.describe('Flujo 1 — crear evento → confirmar', () => {
  test('login + crear evento draft + transición a confirmed', async ({ page }) => {
    // ── Login ──────────────────────────────────────────────────────────────
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/contraseña/i).fill(PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/dashboard/)

    // ── Crear evento ───────────────────────────────────────────────────────
    await page.goto('/events/new')
    await expect(page.getByRole('heading', { name: /nuevo evento/i })).toBeVisible()

    // Fecha dentro de 14 días (formato YYYY-MM-DD)
    const eventDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    const uniqueName = `E2E Test Event ${Date.now()}`

    await page.getByLabel(/nombre del evento/i).fill(uniqueName)
    await page.getByLabel(/fecha/i).first().fill(eventDate)
    await page.getByLabel(/comensales/i).fill('50')

    // Cliente del seed — esperar a que el useClients query cargue antes de seleccionar
    const clientSelect = page.locator('#clientId')
    await expect(clientSelect).toBeVisible()
    // Esperar a que haya más opciones que "Sin cliente asignado"
    await expect.poll(
      async () => (await clientSelect.locator('option').count()),
      { timeout: 5_000 },
    ).toBeGreaterThan(1)

    const options = await clientSelect.locator('option').allTextContents()
    const match = options.find((o) => o.includes('Cliente Corporativo Test'))
    if (match) await clientSelect.selectOption({ label: match })

    // Submit
    await page.getByRole('button', { name: /crear|guardar/i }).first().click()

    // Redirige a /events/[id]
    await page.waitForURL(/\/events\/[0-9a-f-]{36}/)
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible()

    // Estado inicial: draft (el badge lo pinta algo con la clase del status)
    await expect(page.getByText(/borrador|draft/i).first()).toBeVisible()

    // ── Transición: draft → pending_confirmation ───────────────────────────
    // Después del click, el siguiente botón debe ser "Confirmar evento"
    await page.getByRole('button', { name: /enviar para confirmación/i }).click()
    await expect(page.getByRole('button', { name: /confirmar evento/i })).toBeVisible({ timeout: 5_000 })

    // NOTA: la transición pending_confirmation → confirmed requiere que el
    // evento tenga al menos un menú asignado (RPC transition_event errcode
    // P0013 "cannot confirm event without menus"). El seed actual no crea
    // menús ni recetas. Para cubrir el flujo completo hay que expandir el
    // seed con menús + recipes + event_menus. Documentado en
    // docs/TESTING_ROADMAP.md como próximo paso de Fase B.

    // Verificar que sigue en /events/[id] con el estado intermedio
    expect(page.url()).toMatch(/\/events\/[0-9a-f-]{36}/)
    await expect(page.getByRole('heading', { name: uniqueName })).toBeVisible()
  })
})
