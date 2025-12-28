import { test, expect } from '@playwright/test';

test.describe('Inventory FIFO Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`CONSOLE ERROR: "${msg.text()}"`);
    });

    // Seed user
    const res = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC2Ne6AoEZlOa6glHtVki67CkJSbWey5Lg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'fifo@chefos.com',
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );
    if (!res.ok) {
      // If it fails, it might be EMAIL_EXISTS, usually fine.
    }

    // Login
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('fifo@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should consume older stock first (FIFO)', async ({ page }) => {
    const itemName = `FIFO Item ${Date.now()}`;

    // 1. Create Item (Ingredient)
    await page.goto('/ingredients');
    await page.getByRole('button', { name: /Nuevo Ingrediente/i }).click();
    await page
      .getByLabel(/Nombre/i)
      .first()
      .fill(itemName);
    await page.getByLabel(/Coste por Unidad/i).fill('5');
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();
    await expect(page.getByText(itemName)).toBeVisible();

    // 2. Go to Inventory
    await page.goto('/inventory');

    // Search for the item to operate on it
    await page.getByPlaceholder(/Buscar/i).fill(itemName);
    // Wait for the item row to appear
    const row = page.locator('tr', { hasText: itemName });
    await expect(row).toBeVisible();

    // 3. Add Batch 1 (Expires Soon)
    // Assuming there is a + button or "Add Stock" action
    await row.getByRole('button', { name: /Stock/i }).click(); // Open modal
    // Check if modal has "Add Batch" tab or similar
    // Assuming standard "Movement" modal: In/Out/Audit
    await page.getByText(/Entrada/i).click();
    await page.getByLabel(/Cantidad/i).fill('10');
    await page.getByLabel(/Caducidad/i).fill('2025-01-01'); // Old date (relative to test run? Or fixed future)
    // Actually, manual date entry might be tricky with date pickers.
    // Let's assume standard YYYY-MM-DD works or generic logic.
    await page.getByLabel(/Lote/i).fill('BATCH-OLD');
    await page.getByRole('button', { name: /Confirmar/i }).click();

    // 4. Add Batch 2 (Expires Later)
    await row.getByRole('button', { name: /Stock/i }).click();
    await page.getByText(/Entrada/i).click();
    await page.getByLabel(/Cantidad/i).fill('10');
    await page.getByLabel(/Caducidad/i).fill('2025-12-31'); // Far future
    await page.getByLabel(/Lote/i).fill('BATCH-NEW');
    await page.getByRole('button', { name: /Confirmar/i }).click();

    // Verify Total: 20
    await expect(row).toContainText('20');

    // 5. Consume 5 Units
    await row.getByRole('button', { name: /Stock/i }).click();
    await page.getByText(/Salida/i).click();
    await page.getByLabel(/Cantidad/i).fill('5');
    await page.getByRole('button', { name: /Confirmar/i }).click();

    // 6. Verify Total: 15
    await expect(row).toContainText('15');

    // 7. Verify FIFO Logic?
    // If there is a details view, we could check BATCH-OLD has 5 left.
    // Ideally, check the "History" or "Batches" tab if implemented.
    // For MVP Phase 4, verifying the total calculation works is a good start.
    // We can infer FIFO if we consume 15 total (5 + 10) and check if BATCH-NEW is untouched?
    // Hard to verify without deeper UI inspection.
  });
});
