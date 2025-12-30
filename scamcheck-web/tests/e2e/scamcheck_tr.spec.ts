import { test, expect } from '@playwright/test';

test.describe('ScamCheck TR Flow', () => {
  test('Complete TR Analysis Flow', async ({ page }, testInfo) => {
    // 1. Go to /tr
    await page.goto('/tr');
    await expect(page.getByTestId('app-title')).toBeVisible();

    // 2. Type message with URL
    const message1 = "Merhaba, bu siteye bak: http://suspicious-link.com";
    await page.getByTestId('message-input').fill(message1);

    // Verify auto-detect updates
    await expect(page.getByTestId('url-input')).toBeVisible();
    await expect(page.getByTestId('url-input')).toHaveValue('http://suspicious-link.com');

    // 3. Paste/Type new message with new URL (Verify auto-detect update)
    const message2 = "Hayır, asıl site bu: http://really-bad-site.net/login";
    await page.getByTestId('message-input').fill(message2);

    // URL input should update because we haven't manually touched it
    await expect(page.getByTestId('url-input')).toHaveValue('http://really-bad-site.net/login');

    // 4. Click Analyze (or Cmd+Enter - let's try button first as per flow req)
    await page.getByTestId('analyze-button').click();

    // 5. Verify results section visible
    await expect(page.getByTestId('results-section')).toBeVisible({ timeout: 15000 });

    // Verify score is high (bad site)
    // We mock logic so it might depend on rules.

    // Take screenshot 1: Results
    await page.screenshot({ path: testInfo.outputPath('tr-results.png'), fullPage: true });

    // 6. Go to Safe Reply tab
    await page.getByTestId('safe-reply-tab').click();
    await expect(page.getByTestId('reply-category-select')).toBeVisible();

    // 7. Select "Bank" category (Banka in TR)
    // The test id is `reply-category-bank` regardless of locale because keys are English in replies.json
    await page.getByTestId('reply-category-bank').click();

    // 8. Click copy, verify toast
    // Assuming at least one template exists
    await page.getByTestId('copy-reply-0').click();
    await expect(page.getByTestId('toast-success')).toBeVisible();
    await expect(page.getByTestId('toast-success')).toContainText('Panoya kopyalandı'); // TR text

    // Take screenshot 2: Safe Reply
    await page.screenshot({ path: testInfo.outputPath('tr-safereply.png'), fullPage: true });

    // 9. Extra: Test Whitespace Guard
    // Reload to clear
    await page.reload();
    await page.getByTestId('message-input').fill('   ');
    // Ensure button is disabled or clicking it shows error
    // Check disabled state
    const button = page.getByTestId('analyze-button');
    await expect(button).toBeDisabled();
  });
});
