# ScamCheck Web

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-repo%2Fscamcheck-web)

ScamCheck is a secure, client-side web application for analyzing suspicious messages and URLs to detect potential scams, phishing, and fraud.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Playwright**.

## Features

-   **Instant Analysis:** Text and URL analysis directly in the browser.
-   **Privacy First:** Client-side only analysis. No user data is sent to any server.
-   **Safe Reply:** Pre-written, safe templates for replying to potential scammers without revealing personal info.
-   **Multi-language:** Full support for English (EN), Turkish (TR), and German (DE).
-   **Premium UI:** Accessible, high-contrast design with dark/light mode support.
-   **OCR Support:** Extract text from screenshots using client-side OCR (Tesseract.js).
-   **Advanced Detection:** Simulated database checks for URL shorteners, domain age, and reputation (blocklist/allowlist).
-   **Educational:** Tooltips explaining why a message was flagged.
-   **PWA Ready:** Manifest and icons included (basic configuration).

## Tech Stack

-   **Framework:** Next.js 16 (App Router)
-   **Language:** TypeScript
-   **Styling:** Tailwind CSS + Lucide React
-   **Animation:** Framer Motion
-   **Internationalization:** next-intl
-   **Testing:** Playwright (E2E)

## Getting Started

### Prerequisites

-   Node.js 18+
-   npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/scamcheck-web.git
    cd scamcheck-web
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run development server:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Verification & Testing

We use **Playwright** for End-to-End (E2E) testing to ensure critical flows work (especially auto-detection and safe reply).

1.  **Validate JSON files (Pre-build check):**
    ```bash
    npm run validate-json
    ```
    This script checks for syntax errors in locale files. It runs automatically before build.

2.  **Install test browsers:**
    ```bash
    npx playwright install --with-deps
    ```

3.  **Run E2E tests:**
    ```bash
    npm run test:e2e
    ```

    To view the HTML report:
    ```bash
    npx playwright show-report
    ```

## Extending Logic

### Rules (`src/data/rules.json`)
You can add new detection patterns here.

**Example Rule Structure:**

**Example Rule Structure:**

```json
{
  "id": "new_scam_pattern",
  "severity": 30, // 0-100
  "tags": ["phishing", "new_type"],
  "patterns": {
    "en": ["suspicious phrase 1", "phrase 2"],
    "tr": ["şüpheli ifade 1"],
    "de": ["verdächtiger ausdruck 1"]
  }
}
```

### Safe Replies (`src/data/replies.json`)
Add new safe reply templates categorized by type (Bank, Delivery, etc.) and locale.

```json
"templates": {
  "bank": {
    "en": ["I will call the bank directly."],
    "tr": ["Bankayı doğrudan arayacağım."]
  }
}
```

### Explanations (`src/data/explanations.json`)
Add educational tooltips for specific rule IDs.

### Simulated Data
- **Unshortener:** `src/data/unshortenMap.json` maps short URLs to real ones (mock).
- **Domain Age:** `src/data/domainAgeMock.json` mocks domain ages (days).

## OCR Feature
The application uses **Tesseract.js** for client-side Optical Character Recognition.
- **Limitations:** Processing large images happens in the browser and may be slow on older devices.
- **Privacy:** Images are processed locally and never uploaded.

## Deployment on Vercel

The project is optimized for Vercel.

1.  Push your code to GitHub/GitLab/Bitbucket.
2.  Import the project in Vercel.
3.  **Framework Preset:** Next.js
4.  **Root Directory:** `scamcheck-web` (if using the repo structure as provided).
5.  **Build Command:** `next build`
6.  **Environment Variables:** None required for basic functionality.

### Custom Domain

1.  Go to Vercel Project Settings -> Domains.
2.  Add your custom domain.
3.  Vercel handles SSL and routing automatically.

## Contributing

1.  Fork the repo.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.

## Privacy

**Important:** This application performs all analysis on the **client-side**. No message content or URLs are transmitted to our servers for analysis. Analytics (if enabled) only track page views and performance metrics, not user content.
