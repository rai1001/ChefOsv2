import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`CONSOLE ERROR: "${msg.text()}"`);
    });
  });

  test('should login with valid credentials', async ({ page }) => {
    // 1. Seed User
    const email = `auth_valid_${Date.now()}@chefos.com`;
    const password = 'password123';

    await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC2Ne6AoEZlOa6glHtVki67CkJSbWey5Lg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    // 2. Go to Login
    await page.goto('/login');

    // 3. Fill Form
    await page.getByPlaceholder('tu@email.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: /Entrar/i }).click();

    // 4. Verify Redirect
    await expect(page).toHaveURL(/\/dashboard/);
    // Headings like "Centro de Mando" are unique to the dashboard
    await expect(page.getByText(/Centro de Mando/i)).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('invalid@chefos.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: /Entrar/i }).click();

    // Verify Error Message Container
    // Based on LoginPage.tsx CSS
    await expect(page.locator('.text-red-400')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Seed & Login
    const email = `auth_logout_${Date.now()}@chefos.com`;
    const password = 'password123';
    await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyC2Ne6AoEZlOa6glHtVki67CkJSbWey5Lg',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout button is in the footer of sidebar
    // LoginPage.tsx shows the Logout button has title="Cerrar Sesión"
    // Sidebar.tsx line 116: title="Cerrar Sesión"
    await page.getByTitle('Cerrar Sesión').click();

    // Verify Login Page
    await expect(page).toHaveURL(/\/login/);
  });
});
