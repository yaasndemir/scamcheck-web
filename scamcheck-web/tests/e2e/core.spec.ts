import { test, expect } from '@playwright/test';

test.describe('ScamCheck Critical Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Go to English locale for consistency
    await page.goto('/en');
  });

  test('Demo -> Analyze -> Result -> Safe Reply Flow', async ({ page }) => {
    // 1. Initial State
    await expect(page.getByTestId('app-title')).toBeVisible();
    await expect(page.getByTestId('message-input')).toBeEmpty();

    // 2. Click Demo
    await page.getByTestId('demo-button').click();

    // Wait for text to appear (demo loads text)
    await expect(page.getByTestId('message-input')).not.toBeEmpty();

    // Check if URL auto-detect worked (demo has URL)
    await expect(page.getByTestId('url-input')).toBeVisible();

    // 3. Click Analyze
    await page.getByTestId('analyze-button').click();

    // 4. Verify Loading (optional, might be too fast)
    // await expect(page.getByTestId('loading-skeleton')).toBeVisible();

    // 5. Verify Results Section
    await expect(page.getByTestId('results-section')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('score-value')).toBeVisible();
    await expect(page.getByTestId('reasons-list')).toBeVisible();

    // 6. Navigate to Safe Reply Tab
    await page.getByTestId('safe-reply-tab').click();

    // 7. Verify Categories and Selection (Bank should be default or suggested)
    await expect(page.getByTestId('reply-category-select')).toBeVisible();

    // 8. Copy a reply
    await page.getByTestId('copy-reply-0').click();

    // 9. Verify Toast
    await expect(page.getByTestId('toast-success')).toBeVisible();
    await expect(page.getByTestId('toast-success')).toContainText('Copied');
  });

  test('URL Auto Detect Toggle', async ({ page }) => {
      // Toggle detection off
      await page.getByTestId('auto-detect-toggle').uncheck();

      const testUrl = "http://example.com";
      const testMsg = `Check this ${testUrl}`;

      await page.getByTestId('message-input').fill(testMsg);

      // Should NOT show URL input automatically
      await expect(page.getByTestId('url-input')).not.toBeVisible();

      // Toggle on
      await page.getByTestId('auto-detect-toggle').check();

      // Should show now
      await expect(page.getByTestId('url-input')).toBeVisible();
      await expect(page.getByTestId('url-input')).toHaveValue(testUrl);
  });

  test('Manual URL Entry validation', async ({ page }) => {
      // Force show URL input
      await page.getByRole('button', { name: 'URL' }).click();

      await page.getByTestId('url-input').fill('invalid-url');
      await page.getByTestId('analyze-button').click();

      // Check error
      await expect(page.getByTestId('error-inline')).toBeVisible();
      await expect(page.getByTestId('error-inline')).toContainText('Invalid URL');
  });

  test('Language Switching', async ({ page }) => {
      await expect(page.getByTestId('app-title')).toHaveText('ScamCheck');

      // Switch to TR
      await page.getByTestId('language-switcher').getByRole('combobox').selectOption('tr');
      await expect(page).toHaveURL(/.*\/tr/);

      await expect(page.getByTestId('inputSection.placeholder')).not.toBeVisible(); // Just checking we navigated
      // Check localized title if possible, or demo button text
      await expect(page.getByTestId('demo-button')).toHaveText('Demo'); // Common word, maybe bad check

      // Check a specific translated string if possible.
      // Assuming placeholder is translated but hard to check placeholder text in generic way
  });

});
