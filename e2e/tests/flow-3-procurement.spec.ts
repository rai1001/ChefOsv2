import { test, expect } from '@playwright/test'

/**
 * Flujo 3 — Crear solicitud de compra (PR)
 *
 * El flujo completo de TESTING_STRATEGY.md era:
 *   "Crear pedido → aprobar → recibir parcial → inventario actualizado"
 *
 * Aquí cubrimos la primera parte (crear PR con 1 línea). El ciclo completo
 * PR → approve → PO → GR → stock requiere navegar 4-5 pantallas distintas
 * y es frágil contra cambios de UI. Queda documentado como Fase B.5 para
 * implementar tras ver el flujo estable en piloto real.
 */

const EMAIL = 'test-admin@chefos.test'
const PASSWORD = 'Test1234!'

test.describe('Flujo 3 — crear solicitud de compra', () => {
  test('login + crear PR con 1 línea y verificar redirección', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(EMAIL)
    await page.getByLabel(/contraseña/i).fill(PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/dashboard/)

    // Ir al formulario de nueva PR
    await page.goto('/procurement/requests/new')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Esperar a que cargue algún select con productos (useProducts)
    // Puede haber varios selects: urgency, event, product — buscamos el de productos.
    await expect.poll(async () => {
      const all = await page.locator('select').all()
      for (const sel of all) {
        const opts = await sel.locator('option').allTextContents()
        if (opts.some((o) => o.includes('Producto Test'))) return true
      }
      return false
    }, { timeout: 8_000 }).toBe(true)

    // Seleccionar el primer producto del seed en el select que lo contiene
    const selects = await page.locator('select').all()
    let seedProduct = ''
    for (const sel of selects) {
      const opts = await sel.locator('option').allTextContents()
      const match = opts.find((o) => o.includes('Producto Test'))
      if (match) {
        seedProduct = match
        await sel.selectOption({ label: match })
        break
      }
    }
    if (!seedProduct) throw new Error('No se encontró select con productos del seed')

    // Rellenar cantidad (el primer input numérico de la línea)
    await page.locator('input[type="number"]').first().fill('10')

    // Submit
    await page.getByRole('button', { name: /crear|guardar/i }).last().click()

    // Redirige a /procurement
    await page.waitForURL(/\/procurement/, { timeout: 5_000 })

    // Hay al menos una fila/card con PR
    await expect.poll(
      async () => (await page.locator('tbody tr, article, [data-pr]').count()),
      { timeout: 5_000 },
    ).toBeGreaterThan(0)
  })
})
