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

## Testing

We use Playwright for End-to-End (E2E) testing.

1.  Install browsers:
    ```bash
    npx playwright install --with-deps
    ```

2.  Run tests:
    ```bash
    npm run test:e2e
    ```

    To view the report:
    ```bash
    npx playwright show-report
    ```

## Extending Rules

Scam detection rules are defined in `src/data/rules.json`. You can add new patterns or rules without changing the code.

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
