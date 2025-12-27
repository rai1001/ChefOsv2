import { test, expect } from '@playwright/test';

test.describe('Analytics & Inventory Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`CONSOLE ERROR: "${msg.text()}"`);
    });
    page.on('pageerror', (exception) => {
      console.log(`PAGE EXCEPTION: "${exception}"`);
    });

    // Seed user in emulator via standard endpoint
    const res = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC2Ne6AoEZlOa6glHtVki67CkJSbWey5Lg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@chefos.com',
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      if (!text.includes('EMAIL_EXISTS')) {
        console.log('Seeding failed:', res.status, text);
      }
    } else {
      console.log('User seeded successfully');
    }

    // 1. Login
    await page.goto('/login', { timeout: 60000 });

    // Wait for the form to be visible (avoid spinner)
    await expect(page.getByPlaceholder('tu@email.com')).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('tu@email.com').fill('test@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();

    // 2. Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  });

  test('should create an ingredient and then a recipe with correct cost calculation', async ({
    page,
  }) => {
    const ingredientName = `Test Ingredient ${Date.now()}`;
    const ingredientCost = 10.5;

    // 1. Go to Ingredients
    await page.click('nav >> text=Ingredientes');
    await expect(page).toHaveURL('/ingredients');

    // 2. Create Ingredient
    await page.getByRole('button', { name: /Nuevo Ingrediente/i }).click();
    await page
      .getByLabel(/Nombre/i)
      .first()
      .fill(ingredientName);
    await page.getByLabel(/Coste por Unidad/i).fill(ingredientCost.toString());
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();

    // Verify ingredient exists in list
    await expect(page.getByText(ingredientName)).toBeVisible();

    // 3. Go to Recipes
    await page.click('nav >> text=Recetas');
    await expect(page).toHaveURL('/recipes');

    // 4. Create Recipe
    const recipeName = `Cost Test Recipe ${Date.now()}`;
    await page.getByRole('button', { name: /Nueva Receta/i }).click();
    await page.locator('#recipe-name').fill(recipeName);
    await page.locator('#recipe-yield').fill('1');

    // Add ingredient to recipe
    await page.getByRole('button', { name: /Añadir Ingrediente/i }).click();
    await page.getByLabel(/Ingrediente 1/i).selectOption({ label: ingredientName });
    await page.getByLabel(/Cantidad del ingrediente 1/i).fill('2'); // 2 units

    await page.getByRole('button', { name: /Guardar Receta/i }).click();

    // 5. Verify Cost Calculation
    // Total cost should be 10.5 * 2 = 21.0

    // Actually, let's just search it in the list
    await page.getByPlaceholder(/BUSCAR RECETA/i).fill(recipeName);
    // Wait for calculation to show up in the stats or list
    // According to RecipesPage, cost is displayed using getRecipeCost
    await expect(page.getByText('21.00€')).toBeVisible();
  });
});
