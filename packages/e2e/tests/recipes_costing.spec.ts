import { test, expect } from '@playwright/test';

test.describe('Recipe Costing Flow', () => {
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
          email: 'costing@chefos.com',
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );
    // Ignore error if email exists

    // Login
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('costing@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should update recipe cost when ingredients change', async ({ page }) => {
    const ingAName = `Ing A ${Date.now()}`;
    const ingBName = `Ing B ${Date.now()}`;
    const recipeName = `Recipe ${Date.now()}`;

    // 1. Create Ingredients
    await page.goto('/ingredients');

    // Ing A = 10€
    await page.getByRole('button', { name: /Nuevo Ingrediente/i }).click();
    await page
      .getByLabel(/Nombre/i)
      .first()
      .fill(ingAName);
    await page.getByLabel(/Coste por Unidad/i).fill('10');
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();

    // Ing B = 20€
    await page.getByRole('button', { name: /Nuevo Ingrediente/i }).click();
    await page
      .getByLabel(/Nombre/i)
      .first()
      .fill(ingBName);
    await page.getByLabel(/Coste por Unidad/i).fill('20');
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();

    // 2. Create Recipe
    await page.goto('/recipes');
    await page.getByRole('button', { name: /Nueva Receta/i }).click();
    await page.locator('#recipe-name').fill(recipeName);

    // Add Ing A (Quantity 1)
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();
    await page.getByLabel(/Ingrediente 1/i).selectOption({ label: ingAName });
    await page.getByLabel(/Cantidad del ingrediente 1/i).fill('1');

    // Add Ing B (Quantity 2) -> Total should be 10*1 + 20*2 = 50
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();
    // Selector might be tricky for 2nd ingredient if dynamic
    // Assuming 'Ingrediente 2' label appears or we use nth-match
    // Let's rely on standard sequential labels if implemented likely
    await page.getByLabel(/Ingrediente 2/i).selectOption({ label: ingBName });
    await page.getByLabel(/Cantidad del ingrediente 2/i).fill('2');

    await page.getByRole('button', { name: /Guardar Receta/i }).click();

    // 3. Verify Initial Cost
    await page.getByPlaceholder(/BUSCAR RECETA/i).fill(recipeName);
    // Wait for row
    await expect(page.getByText('50.00€')).toBeVisible();

    // 4. Update Ing A Cost -> 10 to 15 (Recipe should become 15 + 40 = 55)
    await page.goto('/ingredients');
    await page.getByPlaceholder(/Buscar/i).fill(ingAName);
    await page.locator('tr', { hasText: ingAName }).click(); // Edit
    // Assuming click on row opens edit or there's an edit button.
    // In many of these apps, row click = details/edit.

    // Wait for edit form
    await page.getByLabel(/Coste por Unidad/i).fill('15');
    await page.getByRole('button', { name: /Guardar/i }).click();

    // 5. Verify Recipe Update
    await page.goto('/recipes');
    await page.getByPlaceholder(/BUSCAR RECETA/i).fill(recipeName);
    await expect(page.getByText('55.00€')).toBeVisible();
  });
});
