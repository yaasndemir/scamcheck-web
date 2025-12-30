from playwright.sync_api import sync_playwright

def verify_scamcheck():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (using Turkish locale as default/example)
        page.goto("http://localhost:3000/tr")

        # Wait for title to be visible
        page.wait_for_selector("h1:has-text('ScamCheck')")

        # 1. Take screenshot of initial state
        page.screenshot(path="verification/initial_state.png")
        print("Initial state screenshot taken")

        # 2. Click Demo button
        page.click("button:has-text('Demo')")

        # 3. Click Analyze
        page.click("button:has-text('Analiz Et')")

        # Wait for results to appear (loading animation is ~800ms)
        page.wait_for_selector("text=Risk Skoru", timeout=5000)

        # 4. Take screenshot of results
        page.screenshot(path="verification/results_state.png")
        print("Results state screenshot taken")

        # 5. Switch to Safe Reply tab
        page.click("button:has-text('Güvenli Cevap')")
        page.wait_for_selector("text=Banka")

        # 6. Take screenshot of Safe Reply
        page.screenshot(path="verification/safe_reply_state.png")
        print("Safe reply state screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_scamcheck()
