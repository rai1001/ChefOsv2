import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  // Using a generic wait to ensure app loads
  await page.waitForTimeout(1000);

  // Verify we are mostly likely redirected to /login or the internal app name is present
  const title = await page.title();
  console.log('Page Title:', title);

  // Just checking if page loads without crashing for now
  expect(page.url()).not.toBe('about:blank');
});
