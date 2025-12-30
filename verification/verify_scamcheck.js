const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Use local dev server URL
  await page.goto('http://localhost:3000/en');

  // Verify elements are visible
  await page.waitForSelector('[data-testid="app-root"]');

  // 1. Initial State Screenshot
  await page.screenshot({ path: 'verification/1-initial.png' });
  console.log('Took initial screenshot');

  // 2. Perform Analysis (Demo)
  await page.locator('[data-testid="demo-button"]').click();

  // Wait for the button to be enabled (it might take a moment due to state update)
  await page.waitForFunction(() => {
    const btn = document.querySelector('[data-testid="analyze-button"]');
    return btn && !btn.disabled;
  });

  // 3. Analyze
  await page.locator('[data-testid="analyze-button"]').click();
  await page.waitForSelector('[data-testid="results-section"]');
  await page.waitForTimeout(2000); // Wait for animations

  // 4. Results Screenshot
  await page.screenshot({ path: 'verification/2-results.png' });
  console.log('Took results screenshot');

  // 5. Safe Reply Tab
  await page.locator('[data-testid="safe-reply-tab"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verification/3-safereply.png' });
  console.log('Took safe reply screenshot');

  await browser.close();
})();
