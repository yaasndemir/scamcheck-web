# scamcheck-web
TR/EN/DE scam & phishing message checker (client-side rules engine)

## E2E Verification

This project uses [Playwright](https://playwright.dev/) for End-to-End testing.

To run the tests:

```bash
cd scamcheck-web
npx playwright install --with-deps
npm run test:e2e
```

The tests verify the core flow:
1.  Navigate to the Turkish locale.
2.  Use the "Demo" feature to populate text.
3.  Analyze the text.
4.  Verify results and "Safe Reply" features.
5.  Capture screenshots in `test-results/`.

## Extending the Project

### Adding Rules
Edit `src/data/rules.json`. You can add new patterns to existing rules or create new rules with specific severity levels and tags.

### Adding Replies
Edit `src/data/replies.json`.
- **Categories**: Add new category keys to the `categories` array.
- **Templates**: Add a new object under `templates` matching the category key. Each category must have `en`, `tr`, and `de` arrays containing string templates.

### Development
1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`
3. Build: `npm run build`
