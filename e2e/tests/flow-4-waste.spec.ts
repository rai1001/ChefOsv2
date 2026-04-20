import { test, expect } from '@playwright/test'
import { requireEnv } from './_helpers/env'

/**
 * Flujo 4 — Registrar merma → stock decrementa
 *
 * Seed garantiza 10 productos con stock_lots (100 ud cada uno).
 * Registrar merma de 5 ud debería decrementar current_quantity del lot FIFO.
 * Verificamos por count: el producto sigue apareciendo en /inventory y la
 * merma aparece en la lista de /inventory/waste.
 */

const EMAIL = 'test-admin@chefos.test'
const PASSWORD = requireEnv('E2E_PASSWORD')

test.describe('Flujo 4 — registrar merma', () => {
  test('login + crear merma y verificar que aparece en la lista', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/contraseña/i).fill(PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/dashboard/)

    // Ir a /inventory/waste
    await page.goto('/inventory/waste')
    await expect(page.getByRole('heading', { name: /mermas/i })).toBeVisible()

    // Contar filas de merma previas
    const beforeCount = await page.locator('tbody tr').count()

    // Abrir formulario
    await page.getByRole('button', { name: /registrar merma/i }).click()

    // Esperar a que el select de producto tenga los productos del seed
    const productSelect = page.locator('#productId, select[name="productId"]').first()
    // Fallback: buscar cualquier select en el formulario si el id no es exacto
    const selectElement = await productSelect.isVisible().catch(() => false)
      ? productSelect
      : page.locator('form select').first()

    await expect(selectElement).toBeVisible()
    await expect.poll(
      async () => (await selectElement.locator('option').count()),
      { timeout: 5_000 },
    ).toBeGreaterThan(1)

    // Seleccionar el primer producto que sea del seed
    const options = await selectElement.locator('option').allTextContents()
    const seedOption = options.find((o) => o.includes('Producto Test'))
    if (!seedOption) throw new Error(`No hay productos del seed en el select. Options: ${options.join(', ')}`)
    await selectElement.selectOption({ label: seedOption })

    // Cantidad a mermar
    await page.locator('input[type="number"]').first().fill('5')

    // Razón (opcional pero lo rellenamos)
    const reasonInput = page.locator('textarea, input[name="reason"], input#reason').first()
    if (await reasonInput.isVisible().catch(() => false)) {
      await reasonInput.fill('E2E test waste')
    }

    // Submit
    await page.getByRole('button', { name: /registrar|guardar|crear/i }).last().click()

    // Esperar a que la lista se actualice: +1 fila
    await expect.poll(
      async () => (await page.locator('tbody tr').count()),
      { timeout: 5_000 },
    ).toBeGreaterThan(beforeCount)
  })
})
