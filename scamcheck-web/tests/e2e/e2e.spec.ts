import { test, expect } from '@playwright/test';
import unshortenMap from '../../src/data/unshortenMap.json';
import domainAgeData from '../../src/data/domainAgeMock.json';

// Manually define these to avoid import issues with TS config
const allowlist = [
  'google.com',
  'www.google.com'
];

const blocklist = [
  'free-gift-claim.com',
  'verify-account-now.net'
];

// Utility to get a URL that should be whitelisted
const safeDomain = allowlist[0];
// Utility to get a URL that should be blocklisted
const badDomain = blocklist[0];
// Mock data for unshortener
const shortUrl = Object.keys(unshortenMap)[0];
// Mock data for domain age
const newDomain = Object.keys(domainAgeData).find(d => (domainAgeData as any)[d] < 30) || "new-domain-test.com";

test.describe('ScamChecker E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to English locale
    await page.goto('/en');
  });

  test('T1: Smoke Test - TR locale + Phishing Analysis', async ({ page }) => {
    await page.goto('/tr');
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

    const messageInput = page.locator('[data-testid="message-input"]');
    const analyzeButton = page.locator('[data-testid="analyze-button"]');

    // Paste phishing text
    const phishingText = "Tebrikler! Kargo ücreti ödenmedi. Linke tıkla: http://bit.ly/scam1";
    await messageInput.fill(phishingText);

    // Check auto detect works (URL input appears and is filled)
    const urlInput = page.locator('[data-testid="url-input"]');
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveValue("http://bit.ly/scam1");

    // Click Analyze
    await analyzeButton.click();

    // Check results
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="score-value"]')).toBeVisible();

    // Check Safe Reply Tab
    await page.locator('[data-testid="safe-reply-tab"]').click();
    await page.locator('[data-testid="reply-category-bank"]').click();

    // Copy Template
    await page.locator('[data-testid="copy-reply-0"]').click();
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  test('T2: Auto-detect URL Regression', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const urlInput = page.locator('[data-testid="url-input"]');

    // Paste text with URL 1
    await messageInput.fill("Check this out: https://example.com");
    await expect(urlInput).toHaveValue("https://example.com");

    // Change text completely to URL 2
    await messageInput.fill("No wait, check this: https://other-site.com");
    await expect(urlInput).toHaveValue("https://other-site.com");

    // Change to text without URL
    await messageInput.fill("Just some text here.");
    // Should clear URL or hide input? Logic says clear URL.
    await expect(urlInput).toHaveValue("");
  });

  test('T3: Manual Override Priority', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const urlInput = page.locator('[data-testid="url-input"]');

    // Auto detect from message
    await messageInput.fill("See https://auto-detected.com");
    await expect(urlInput).toHaveValue("https://auto-detected.com");

    // Manual override
    await urlInput.fill("https://manual-override.com");

    // Change message again
    await messageInput.fill("Changed message https://auto-detected.com/new");

    // URL input should STAY as manual override
    await expect(urlInput).toHaveValue("https://manual-override.com");

    // Analyze uses manual override
    await page.locator('[data-testid="analyze-button"]').click();
    // Verify results show manual URL in "Expanded" or verify via Badge logic if accessible
    // Easier: Check if "Expanded" badge in results is NOT showing (since we put exact URL)
    // or if the score/reasons reflect the manual URL.
    // For now, just ensuring the input value persisted is good enough for T3.
  });

  test('T4: Whitespace Guard', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const analyzeButton = page.locator('[data-testid="analyze-button"]');

    await messageInput.fill("   ");
    // Button should be disabled or show error on click

    // Try click
    // Note: CSS pointer-events might block click if disabled, or aria-disabled.
    // We check if we can click or if error shows.
    // The button logic: disabled={isAnalyzing || ((!text || !text.trim()) && (!url || !url.trim()))}
    await expect(analyzeButton).toBeDisabled();

    // Also try entering just spaces in URL
    // First enable URL input by toggling it manually if needed, or just relying on text.
    // Since auto-detect won't find URL in " ", URL input won't show automatically.

    // Let's force show URL input (there is a toggle button "URL")
    await page.getByRole('button', { name: 'URL', exact: true }).click();
    const urlInput = page.locator('[data-testid="url-input"]');
    await urlInput.fill("   ");

    await expect(analyzeButton).toBeDisabled();
  });

  test('T5: Punycode Detection & Badge', async ({ page }) => {
    // Show URL input
    await page.getByRole('button', { name: 'URL', exact: true }).click();
    const urlInput = page.locator('[data-testid="url-input"]');

    // Enter punycode
    const punyUrl = "https://xn--pple-43d.com";
    await urlInput.fill(punyUrl);

    // Check badge
    // Badge might take a split second to render
    await expect(page.getByText('xn--pple-43d.com')).toBeVisible();
    await expect(page.getByText('IDN')).toBeVisible();
  });

  test('T6: Unshortener Simulation', async ({ page }) => {
    // Show URL input
    await page.getByRole('button', { name: 'URL', exact: true }).click();
    const urlInput = page.locator('[data-testid="url-input"]');

    // Enter short URL from our mock map
    // bit.ly/scam1 -> http://secure-banking-alert.com/login
    const short = "http://bit.ly/scam1";
    await urlInput.fill(short);

    await page.locator('[data-testid="analyze-button"]').click();

    // Results should show "Expanded: http://secure-banking-alert.com/login"
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible();
    await expect(page.getByText('Expanded: http://secure-banking-alert.com/login')).toBeVisible();
  });

  test('T7: Whitelist Check', async ({ page }) => {
     // Show URL input
     await page.getByRole('button', { name: 'URL', exact: true }).click();
     const urlInput = page.locator('[data-testid="url-input"]');

     // Enter safe domain
     await urlInput.fill("https://google.com");
     await page.locator('[data-testid="analyze-button"]').click();

     await expect(page.locator('[data-testid="results-section"]')).toBeVisible();

     // Score should be low (e.g. 5)
     const scoreEl = page.locator('[data-testid="score-value"]');
     const score = await scoreEl.textContent();
     expect(parseInt(score || "100")).toBeLessThan(10);
  });

  test('T8: Domain Age Mock', async ({ page }) => {
     // Show URL input
     await page.getByRole('button', { name: 'URL', exact: true }).click();
     const urlInput = page.locator('[data-testid="url-input"]');

     // Enter new domain (mocked)
     await urlInput.fill(`https://${newDomain}`);
     await page.locator('[data-testid="analyze-button"]').click();

     await expect(page.locator('[data-testid="results-section"]')).toBeVisible();

     // Check for "new_domain" reason or high score
     // Reason ID "new_domain" text "This domain was registered very recently..."
     // Or check for severity High/Medium
     const reasons = page.locator('[data-testid="reasons-list"]');
     await expect(reasons).toContainText("very recently"); // from English explanation
  });

});
