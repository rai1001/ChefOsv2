import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /CulinaryOs v2.0/i })).toBeVisible();
});

test('shows phase 1 completion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Fase 1: Fundación Completada/i)).toBeVisible();
});
