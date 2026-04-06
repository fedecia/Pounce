import { test, expect } from '@playwright/test';

test.setTimeout(60000); // Increase test timeout to 60 seconds

test('Pounce app loads and displays key elements', async ({ page }) => {
  // Navigate to the app via file protocol (fallback if server is inaccessible)
  // Absolute path to index.html
  const filePath = '/home/fcia/.openclaw/workspace/monopolystreet/index.html';
  await page.goto(`file://${__dirname}/${filePath}`, { waitUntil: 'networkidle', timeout: 30000 });

  // Verify the title
  await expect(page).toHaveTitle(/Pounce|Vite App/);

  // Check if the "Quote" panel is visible
  const quotePanel = page.locator('text=Quote');
  await expect(quotePanel).toBeVisible();

  // Check if the "Portfolio" section is visible
  const portfolioSection = page.locator('text=Portfolio');
  await expect(portfolioSection).toBeVisible();

  // Check if the "Get Price" button is visible and clickable
  const getPriceButton = page.locator('button:has-text("Get Price")');
  await expect(getPriceButton).toBeVisible();
  await expect(getPriceButton).toBeEnabled();

  // Check if the "Buy" button is visible and clickable
  const buyButton = page.locator('button:has-text("Buy")');
  await expect(buyButton).toBeVisible();
  await expect(buyButton).toBeEnabled();

  // Verify that the app doesn't show errors
  const errorMessage = page.locator('text=Error');
  await expect(errorMessage).not.toBeVisible();
});