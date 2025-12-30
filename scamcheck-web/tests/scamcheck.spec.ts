import { test, expect } from '@playwright/test';

test('ScamCheck E2E Flow', async ({ page }) => {
  // 1. Navigate to the page
  await page.goto('http://localhost:3000/tr');

  // 2. Verify title/header (assuming "ScamCheck" is in the title or a header)
  // Checking the document title or a main header
  await expect(page).toHaveTitle(/ScamCheck/);

  // Take initial screenshot
  await page.screenshot({ path: 'test-results/initial.png' });

  // 3. Click Demo Button
  const demoButton = page.getByTestId('demo-button');
  await expect(demoButton).toBeVisible();
  await demoButton.click();

  // 4. Click Analyze Button
  const analyzeButton = page.getByTestId('analyze-button');
  await expect(analyzeButton).toBeVisible();
  await analyzeButton.click();

  // 5. Verify Results Section appears
  const resultsSection = page.getByTestId('results-section');
  await expect(resultsSection).toBeVisible();

  // Wait for animation/content to settle slightly
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/results.png' });

  // 6. Switch to Safe Reply Tab
  const safeReplyTab = page.getByTestId('safe-reply-tab');
  await expect(safeReplyTab).toBeVisible();
  await safeReplyTab.click();

  // 7. Verify Bank Category is visible
  const bankCategory = page.getByTestId('safe-reply-category-bank');
  await expect(bankCategory).toBeVisible();

  // Wait for animation/content
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/safe-reply.png' });
});
