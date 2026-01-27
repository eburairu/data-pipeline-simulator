from playwright.sync_api import Page, expect, sync_playwright
import os

def test_idmc_features(page: Page):
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    page.on("pageerror", lambda err: print(f"Page Error: {err}"))

    page.goto("http://localhost:5173/")

    # Wait for hydration
    page.wait_for_timeout(5000)

    # 1. Verify Simulation Tab (Default)
    expect(page.get_by_text("Data Pipeline Simulator")).to_be_visible(timeout=10000)

    # Wait for graph to load
    page.wait_for_timeout(2000)
    page.screenshot(path="/home/jules/verification/simulation.png")

    # 2. Go to Settings
    page.get_by_role("button", name="Settings").click()
    expect(page.get_by_text("IDMC CDI Settings")).to_be_visible()

    # Use heading role for specific matches
    expect(page.get_by_role("heading", name="Connections")).to_be_visible()
    expect(page.get_by_role("heading", name="Mappings")).to_be_visible()
    expect(page.get_by_role("heading", name="Mapping Tasks (Execution)")).to_be_visible()

    # Take screenshot of settings
    page.screenshot(path="/home/jules/verification/settings.png")

if __name__ == "__main__":
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_idmc_features(page)
        finally:
            browser.close()
