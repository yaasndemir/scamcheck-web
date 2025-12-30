# ScamCheck Web

A web application to analyze suspicious messages and URLs, helping users identify potential scams.

## Features

-   **Message Analysis:** Paste suspicious text to check for scam indicators.
-   **URL Analysis:** Enter URLs to verify if they are safe or malicious.
-   **Multi-language Support:** Available in Turkish (TR), English (EN), and German (DE).

## Tech Stack

-   **Framework:** [Next.js](https://nextjs.org/) (App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Internationalization:** [next-intl](https://next-intl-docs.vercel.app/)

## Getting Started

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the development server:**

    ```bash
    npm run dev
    ```

3.  **Open the application:**

    Open [http://localhost:3000](http://localhost:3000) with your browser.

    The application will automatically redirect to the default locale (e.g., `/tr`). You can also visit specific locales:
    -   [http://localhost:3000/tr](http://localhost:3000/tr)
    -   [http://localhost:3000/en](http://localhost:3000/en)
    -   [http://localhost:3000/de](http://localhost:3000/de)

## Project Structure

-   `src/app/[locale]`: App Router pages with locale parameter.
-   `messages`: Localization JSON files.
-   `src/i18n`: Internationalization configuration.
-   `src/middleware.ts`: Middleware for locale routing.
