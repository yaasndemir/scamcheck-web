# scamcheck-web
TR/EN/DE scam &amp; phishing message checker (client-side rules engine)

## E2E Verification

This project uses [Playwright](https://playwright.dev/) for End-to-End testing.

To run the tests:

```bash
cd scamcheck-web
npm run test:e2e
```

The tests verify the core flow:
1.  Navigate to the Turkish locale.
2.  Use the "Demo" feature to populate text.
3.  Analyze the text.
4.  Verify results and "Safe Reply" features.
5.  Capture screenshots in `test-results/`.
