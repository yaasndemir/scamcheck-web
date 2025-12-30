import { test, expect } from '@playwright/test';
import path from 'path';

test('Generate Verification Screenshots', async ({ page }, testInfo) => {
  // 1. Initial State
  await page.goto('/en');
  await expect(page.getByTestId('app-title')).toBeVisible();
  await page.screenshot({ path: 'verification-1-initial.png', fullPage: true });

  // 2. Demo & Analyze
  await page.getByTestId('demo-button').click();
  await expect(page.getByTestId('url-input')).toBeVisible();

  await page.getByTestId('analyze-button').click();
  await expect(page.getByTestId('results-section')).toBeVisible({ timeout: 15000 });

  // Wait for animations to settle
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'verification-2-results.png', fullPage: true });

  // 3. Safe Reply
  await page.getByTestId('safe-reply-tab').click();
  await expect(page.getByTestId('reply-category-select')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verification-3-safereply.png', fullPage: true });
});
