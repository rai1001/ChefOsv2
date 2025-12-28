import { test, expect } from '@playwright/test';

test.describe('Events Workflow', () => {
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
          email: 'events@chefos.com',
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );

    // Login
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('events@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create, update, and delete an event', async ({ page }) => {
    // 1. Navigate to Events
    await page.goto('/events');

    // 2. Create Event
    // Click on a day (e.g. 15) to open the details modal
    await page.locator('.grid > div').filter({ hasText: /^15$/ }).first().click();

    // Click "Añadir Nuevo Evento" in the modal
    await page.getByRole('button', { name: /Añadir Nuevo Evento/i }).click();

    await page.getByPlaceholder('Nombre del Evento').fill('Test Event');
    await page.getByPlaceholder('PAX').fill('10');
    await page.getByRole('button', { name: /Crear Evento/i }).click();

    // 3. Verify Creation
    await expect(page.getByText('Test Event')).toBeVisible();

    // 4. Verify in list
    await expect(page.getByText('10 PAX')).toBeVisible();

    // 5. Delete Event
    // Re-open if needed or click trash directly if visible (it's in the modal)
    await page.locator('.grid > div').filter({ hasText: /^15$/ }).first().click();
    await page
      .getByRole('button')
      .filter({ has: page.locator('svg.lucide-trash2') })
      .first()
      .click();
    await page.getByRole('button', { name: /Confirmar/i }).click();

    // 6. Verify Deletion
    await expect(page.getByText('Test Event')).not.toBeVisible();
  });
});
