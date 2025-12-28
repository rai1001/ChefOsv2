import { test, expect } from '@playwright/test';

test.describe('HACCP Compliance Flow', () => {
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
          email: 'haccp@chefos.com',
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );

    // Login
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('haccp@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should configure PCC, record checks, and view compliance report', async ({ page }) => {
    const pccName = `Fridge Temp ${Date.now()}`;

    // 1. Configure PCC
    await page.goto('/haccp');

    await page.getByRole('button', { name: /Configuración/i }).click(); // Tab/Button
    await page.getByRole('button', { name: /Nuevo Punto de Control/i }).click();
    await page.getByLabel(/Nombre/i).fill(pccName);
    await page.getByLabel(/Límite Máximo/i).fill('5');
    await page.getByRole('button', { name: /Guardar/i }).click();

    // 2. Record Checkpoint (Pass)
    await page.getByRole('button', { name: /Registros/i }).click(); // Or "Daily Checks"
    // Find the PCC card/row
    const pccCard = page.locator('div', { hasText: pccName });
    await expect(pccCard).toBeVisible();

    await pccCard.getByRole('button', { name: /Registrar/i }).click();
    await page.getByLabel(/Valor/i).fill('3');
    await page.getByRole('button', { name: /Confirmar/i }).click();
    // Verify visual feedback (Green/Pass)
    await expect(pccCard).toContainText('PASS'); // or similar indicator

    // 3. Record Checkpoint (Fail) - maybe another reading later or overwrite?
    // Let's create another PCC for Failure test to keep it clean.
    // Actually, let's just create 2 PCCs initially or reuse logic.
    // Let's reuse: Update measurement? Or new measurement.
    await pccCard.getByRole('button', { name: /Registrar/i }).click();
    await page.getByLabel(/Valor/i).fill('8');
    await page.getByRole('button', { name: /Confirmar/i }).click();

    // Verify Fail
    await expect(pccCard).toContainText('FAIL');

    // 4. Register Corrective Action
    await pccCard.getByRole('button', { name: /Corregir/i }).click(); // Resolve button
    await page.getByLabel(/Acción Correctiva/i).fill('Discarded items');
    await page.getByRole('button', { name: /Guardar/i }).click();

    // 5. Check Report
    await page.getByRole('button', { name: /Reportes/i }).click();
    // Should show today's report
    await expect(page.getByText(/Cumplimiento/i)).toBeVisible();
    // Maybe check score?
    // 1 Pass, 1 Fail (Resolved). Total compliance depends on logic (resolved usually counts as compliant or flagged).
    // Let's just verify the readings are listed.
    await expect(page.getByText('3')).toBeVisible(); // The good reading
    await expect(page.getByText('8')).toBeVisible(); // The bad reading
  });
});
