import { test, expect } from '@playwright/test'

/**
 * Flujo 5 — Crear etiqueta → aparece en lista
 *
 * El flujo completo documentado en TESTING_STRATEGY.md era:
 *   "Crear etiqueta → trace_lot devuelve la trazabilidad"
 *
 * trace_lot requiere un lot_id concreto de la etiqueta (ruta dinámica
 * /compliance/trace/[lot_id]). Aquí verificamos el happy path: crear
 * label + verificar que el count de labels en la UI aumenta.
 *
 * La verificación de trace_lot con datos reales requiere seed con
 * kitchen_orders/recipes que lleguen a production → defer a Fase B.5.
 */

const EMAIL = 'test-admin@chefos.test'
const PASSWORD = 'Test1234!'

test.describe('Flujo 5 — crear etiqueta', () => {
  test('login + crear label manual y verificar que aparece en la lista', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/contraseña/i).fill(PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/dashboard/)

    // Ir a /compliance/labels
    await page.goto('/compliance/labels')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Contar labels previas (filas o cards — depende de UI, intentamos ambos)
    const beforeRows = await page.locator('tbody tr, [data-label-card], article').count()

    // Abrir formulario
    const newBtn = page.getByRole('button', { name: /nueva|crear|\+/i }).first()
    await newBtn.click()

    // Rellenar nombre libre
    const nameInput = page.locator('input').filter({ hasText: '' }).nth(0)
    // Mejor: buscar el input por placeholder o name más concreto
    const nameField = page.locator('input[type="text"]').first()
    await expect(nameField).toBeVisible()
    await nameField.fill('Preparación E2E test')

    // Submit
    await page.getByRole('button', { name: /crear|guardar|generar/i }).last().click()

    // Esperar a que aparezca la nueva label
    await expect.poll(
      async () => (await page.locator('tbody tr, [data-label-card], article').count()),
      { timeout: 5_000 },
    ).toBeGreaterThan(beforeRows)
  })
})
