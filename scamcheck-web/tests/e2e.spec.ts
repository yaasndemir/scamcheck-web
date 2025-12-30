
import { test, expect } from '@playwright/test';

test('Critical Flow Verification', async ({ page }) => {
  // 1. Open /tr (Turkish locale)
  await page.goto('/tr');

  // 2. Demo
  const demoButton = page.getByTestId('demo-button');
  await expect(demoButton).toBeVisible();
  await demoButton.click();

  // Verify text area is populated
  const messageInput = page.getByTestId('message-input');
  await expect(messageInput).not.toBeEmpty();

  // Verify URL input is populated (auto-detect)
  // Need to expand URL input or just check value if it's in DOM?
  // The logic sets the state, so if we open the input it should be there.
  // But let's check analysis which is the goal.

  // 3. Analyze
  const analyzeButton = page.getByTestId('analyze-button');
  await expect(analyzeButton).toBeEnabled();
  await analyzeButton.click();

  // 4. Results Section
  const resultsSection = page.getByTestId('results-section');
  await expect(resultsSection).toBeVisible({ timeout: 5000 }); // Wait for analysis

  // Check score
  const scoreValue = page.getByTestId('score-value');
  await expect(scoreValue).toBeVisible();

  // Screenshot 1: Results
  await page.screenshot({ path: 'test-results/results.png' });

  // 5. Safe Reply Tab
  const safeReplyTab = page.getByTestId('safe-reply-tab');
  await safeReplyTab.click();

  // 6. Select Bank Category
  // It might be default, but let's click explicitly
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
  await page.screenshot({ path: 'test-results/safe-reply.png' });

  // Additional Check: Keyboard Shortcut
  // Reload to reset
  await page.reload();
  await demoButton.click();
  await messageInput.focus();
  await page.keyboard.press('Control+Enter'); // Or Meta+Enter for Mac, Playwright handles modifiers well usually
  // If platform is mac, might need Meta. Let's try to detect or just send both?
  // Playwright's `Control+Enter` sends Control on all platforms.
  // The app code checks (e.metaKey || e.ctrlKey). So Control+Enter should work on Linux (sandbox).

  await expect(resultsSection).toBeVisible({ timeout: 5000 });

  // Screenshot 3: Shortcut Result
  await page.screenshot({ path: 'test-results/shortcut.png' });
});
