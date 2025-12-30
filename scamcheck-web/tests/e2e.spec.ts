
import { test, expect } from '@playwright/test';

test('Critical Flow Verification', async ({ page }, testInfo) => {
  // 1. Open /tr (Turkish locale)
  await page.goto('/tr');

  // Verify App Title
  await expect(page.getByTestId('app-title')).toBeVisible();

  // 2. Demo
  const demoButton = page.getByTestId('demo-button');
  await expect(demoButton).toBeVisible();
  await demoButton.click();

  // Verify text area is populated
  const messageInput = page.getByTestId('message-input');
  await expect(messageInput).not.toBeEmpty();

  // 3. Analyze
  const analyzeButton = page.getByTestId('analyze-button');
  await expect(analyzeButton).toBeEnabled();
  await analyzeButton.click();

  // 4. Results Section
  const resultsSection = page.getByTestId('results-section');
  await expect(resultsSection).toBeVisible({ timeout: 10000 }); // Wait for analysis

  // Check score
  const scoreValue = page.getByTestId('score-value');
  await expect(scoreValue).toBeVisible();

  // Screenshot 1: Results
  await page.screenshot({ path: testInfo.outputPath('results.png') });

  // 5. Safe Reply Tab
  const safeReplyTab = page.getByTestId('safe-reply-tab');
  await safeReplyTab.click();

  // 6. Select Bank Category
  const bankCategory = page.getByTestId('reply-category-bank');
  await expect(bankCategory).toBeVisible();
  await bankCategory.click();

  // 7. Copy First Template
  const firstCopyButton = page.getByTestId('copy-reply-0');
  await expect(firstCopyButton).toBeVisible();
  await firstCopyButton.click();

  // 8. Toast
  const toast = page.getByTestId('toast');
  await expect(toast).toBeVisible();

  // Screenshot 2: Safe Reply
  await page.screenshot({ path: testInfo.outputPath('safe-reply.png') });

  // Additional Check: Keyboard Shortcut
  // Reload to reset
  await page.reload();
  await demoButton.click();
  await messageInput.focus();
  await page.keyboard.press('Control+Enter');
  // Note: App logic supports metaKey or ctrlKey, so Control+Enter is safe in most environments.

  await expect(resultsSection).toBeVisible({ timeout: 10000 });

  // Screenshot 3: Shortcut Result
  await page.screenshot({ path: testInfo.outputPath('shortcut.png') });
});
