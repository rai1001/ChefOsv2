import { test, expect } from '@playwright/test';

test.describe('Supplier Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Seed user
    try {
      await fetch(
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
    } catch (e) {
      /* Ignore if already exists */
    }

    // 2. Login
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('test@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create, update and delete a supplier', async ({ page }) => {
    const supplierName = `Test Supplier ${Date.now()}`;

    // 1. Navigate to Suppliers
    await page.click('nav >> text=Proveedores');
    await expect(page).toHaveURL('/suppliers');

    // 2. Create
    await page.getByRole('button', { name: /Nuevo Proveedor/i }).click();
    await page.getByLabel(/Nombre Empresa/i).fill(supplierName);
    await page.getByLabel(/Persona de contacto/i).fill('John Doe');
    await page.getByRole('button', { name: /Guardar Proveedor/i }).click();

    // Verify creation
    await expect(page.getByText(supplierName)).toBeVisible();

    // 3. Edit (Hover trigger)
    // Search first to isolate
    await page.getByPlaceholder(/BUSCAR PROVEEDOR/i).fill(supplierName);
    await page.waitForTimeout(500);

    const card = page.locator('.premium-glass').filter({ hasText: supplierName }).first();
    await card.hover();
    await card.getByTitle('Editar').click();

    // Update contact
    await page.getByLabel(/Persona de contacto/i).fill('Jane Doe');
    await page.getByRole('button', { name: /Guardar Proveedor/i }).click();

    // Verify update
    await expect(page.getByText('Jane Doe')).toBeVisible();

    // 4. Delete
    page.on('dialog', (dialog) => dialog.accept());
    await card.hover();
    await card.getByTitle('Eliminar').click();

    // Verify deletion
    await expect(page.getByText(supplierName)).not.toBeVisible();
  });
});
