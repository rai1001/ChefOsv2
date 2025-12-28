import { test, expect } from '@playwright/test';

test.describe('Production Kanban Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`CONSOLE ERROR: "${msg.text()}"`);
    });

    // Seed user
    await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC2Ne6AoEZlOa6glHtVki67CkJSbWey5Lg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'kanban@chefos.com',
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );

    // Login
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('kanban@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create task, complete it, and verify stock deduction', async ({ page }) => {
    const ingName = `Kanban Ing ${Date.now()}`;
    const recipeName = `Kanban Recipe ${Date.now()}`;

    // 1. Create Ingredient with Stock
    await page.goto('/ingredients');
    await page.getByRole('button', { name: /Nuevo Ingrediente/i }).click();
    await page
      .getByLabel(/Nombre/i)
      .first()
      .fill(ingName);
    await page.getByLabel(/Coste/i).fill('1');
    await page.getByRole('button', { name: /Añadir/i }).click();

    // Add Stock (100)
    await page.goto('/inventory');
    await page.getByPlaceholder(/Buscar/i).fill(ingName);
    // Assuming row needs click or expansion, or button directly
    const row = page.locator('tr', { hasText: ingName });
    await row.getByRole('button', { name: /Stock/i }).click();
    await page.getByText(/Entrada/i).click();
    await page.getByLabel(/Cantidad/i).fill('100');
    await page.getByRole('button', { name: /Confirmar/i }).click();

    // 2. Create Recipe (Uses 10)
    await page.goto('/recipes');
    await page.getByRole('button', { name: /Nueva Receta/i }).click();
    await page.locator('#recipe-name').fill(recipeName);
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();
    await page.getByLabel(/Ingrediente 1/i).selectOption({ label: ingName });
    await page.getByLabel(/Cantidad del ingrediente 1/i).fill('10');
    await page.getByRole('button', { name: /Guardar Receta/i }).click();

    // 3. Create Production Task
    await page.goto('/production');
    await page.getByRole('button', { name: /Nueva Tarea/i }).click();
    // Select Recipe
    await page.getByLabel(/Receta/i).selectOption({ label: recipeName });
    await page.getByLabel(/Cantidad/i).fill('1'); // 1 Batch
    await page.getByRole('button', { name: /Crear/i }).click();

    // 4. Verify Task in 'Pending' (or To Do)
    await expect(page.getByText(recipeName)).toBeVisible();
    await expect(page.getByText(/Pendiente/i)).toBeVisible();

    // 5. Start Task (Move to In Progress)
    // Assuming drag and drop or button click
    // Let's assume a "Start" button for simplicity
    await page
      .locator('div', { hasText: recipeName })
      .getByRole('button', { name: /Empezar/i })
      .click();
    await expect(page.getByText(/En Progreso/i)).toBeVisible();

    // 6. Complete Task
    await page
      .locator('div', { hasText: recipeName })
      .getByRole('button', { name: /Completar/i })
      .click();
    await expect(page.getByText(/Completado/i)).toBeVisible();
    // Or it disappears from active view? Assume it stays or moves to Done column.

    // 7. Verify Stock Deduction (Should be 90)
    await page.goto('/inventory');
    await page.getByPlaceholder(/Buscar/i).fill(ingName);
    await expect(row).toContainText('90');
  });
});
