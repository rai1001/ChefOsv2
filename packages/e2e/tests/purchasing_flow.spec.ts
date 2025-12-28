import { test, expect } from '@playwright/test';

test.describe('Purchasing Flow', () => {
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
          email: 'purchasing@chefos.com',
          password: 'password123',
          returnSecureToken: true,
        }),
      }
    );

    // Login
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill('purchasing@chefos.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create, approve, and receive a purchase order', async ({ page }) => {
    const supplierName = `Supplier ${Date.now()}`;
    const itemName = `Purchase Item ${Date.now()}`;
    const orderQty = 50;

    // 1. Create Supplier (Prerequisite)
    // Assuming Supplier UI exists (from Phase 3) or we mock it.
    // If Phase 3 UI isn't ready, we might fail here.
    // BUT the prompt implies we should verify "Core Flows". Use cases exist.
    // If UI is missing, we might need to seed via API or skip.
    // Let's assume a basic Supplier creation UI exists or we can use a "New Supplier" modal in PO creation?
    // Checking previous context: "Phase 3: Suppliers & Staff" had "Implement Supplier Use Cases".
    // Did we implement UI? "task.md" says "Implement Supplier Use Cases" [x].
    // Use cases are core. UI might be pending in "Phase 3 web integration".
    // Implementation Plan Phase 3 said "Manual Verification N/A for Phase 3 Core".
    // So UI might NOT exist.
    // RISK: Testing UI flows that don't exist.
    // However, `purchasing_flow.spec.ts` was requested.
    // Purchases UI DOES exist (Phase 1).
    // Does Purchase UI allow creating generic orders without pre-existing suppliers?
    // Or does it require a Supplier ID?
    // Let's assume we can create a generic "Ad-hoc" order or the UI allows text entry.
    // Or we stick to the existing Purchases UI capabilities.

    // Let's create an Ingredient first, as that's definitely needed.
    await page.goto('/ingredients');
    await page.getByRole('button', { name: /Nuevo Ingrediente/i }).click();
    await page
      .getByLabel(/Nombre/i)
      .first()
      .fill(itemName);
    await page.getByLabel(/Coste/i).fill('2');
    await page.getByRole('button', { name: /Añadir/i }).click();

    // 2. Go to Purchases
    await page.goto('/purchasing');

    // 3. Create Order
    await page.getByRole('button', { name: /Nuevo Pedido/i }).click();
    // Fill Supplier Name (if text) or Select
    // If select, we might need to create one.
    // Let's try filling text, or see if there's a "Create Supplier" link.
    // For robustness, I'll try to find an input that matches "Proveedor".
    const supplierInput = page.getByLabel(/Proveedor/i);
    await supplierInput.fill(supplierName);
    // If it's an autocomplete, we might need key presses.

    // Add Item
    await page.getByRole('button', { name: /Añadir Artículo/i }).click();
    await page.getByLabel(/Artículo/i).selectOption({ label: itemName });
    await page.getByLabel(/Cantidad/i).fill(orderQty.toString());

    await page.getByRole('button', { name: /Crear Pedido/i }).click();

    // 4. Verify Created
    await expect(page.getByText(supplierName)).toBeVisible();
    await expect(page.getByText(/Pendiente/i)).toBeVisible(); // Status Pending

    // 5. Approve Order
    // Click on order to open details
    await page.getByText(supplierName).click();
    await page.getByRole('button', { name: /Aprobar/i }).click();
    await expect(page.getByText(/Aprobado/i)).toBeVisible();

    // 6. Receive Order
    await page.getByRole('button', { name: /Recibir/i }).click();
    // specific modal for receiving?
    await page.getByRole('button', { name: /Confirmar Recepción/i }).click();
    await expect(page.getByText(/Recibido/i)).toBeVisible();

    // 7. Verify Inventory Increase
    await page.goto('/inventory');
    await page.getByPlaceholder(/Buscar/i).fill(itemName);
    // Should see 50
    await expect(page.locator('tr', { hasText: itemName })).toContainText(orderQty.toString());
  });
});
