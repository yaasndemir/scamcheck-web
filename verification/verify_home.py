from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_scamcheck_home(page: Page):
    # Navigate to the home page (which should redirect to a locale, e.g., /tr)
    page.goto("http://localhost:3000")

    # Wait for the redirection to happen
    time.sleep(2)

    # Verify title
    expect(page).to_have_title("ScamCheck Web")

    # Verify content in default locale (TR)
    expect(page.get_by_role("heading", name="ScamCheck Web")).to_be_visible()
    expect(page.get_by_text("Şüpheli mesajları ve URL'leri analiz ederek güvende kalın.")).to_be_visible()
    expect(page.get_by_placeholder("Şüpheli mesajı buraya yapıştırın...")).to_be_visible()

    # Take screenshot of TR home
    page.screenshot(path="verification/scamcheck_tr.png")

    # Navigate to EN
    page.goto("http://localhost:3000/en")
    expect(page.get_by_text("Analyze suspicious messages and URLs to stay safe.")).to_be_visible()
    page.screenshot(path="verification/scamcheck_en.png")

    # Navigate to DE
    page.goto("http://localhost:3000/de")
    expect(page.get_by_text("Analysieren Sie verdächtige Nachrichten und URLs, um sicher zu bleiben.")).to_be_visible()
    page.screenshot(path="verification/scamcheck_de.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_scamcheck_home(page)
        finally:
            browser.close()
