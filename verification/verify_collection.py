import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})

    print("Navigating to http://localhost:5173")
    try:
        page.goto("http://localhost:5173")
        time.sleep(5)

        # Click Settings (Top Navigation)
        print("Clicking Settings tab (Top Nav)...")
        settings_btn = page.locator("button:has-text('Settings'), button:has-text('設定')")
        if settings_btn.count() > 0:
            settings_btn.first.click()
        else:
            print("Settings button not found")
            return

        time.sleep(1)

        # Click Data Hub (Internal Tab)
        print("Clicking Data Hub tab...")
        # In SettingsPanel.tsx: { id: 'integrationHub', label: 'Data Hub', ... }
        data_hub_tab = page.locator("button:has-text('Data Hub')")
        if data_hub_tab.count() > 0:
            data_hub_tab.first.click()
        else:
            print("Data Hub tab not found")
            return

        time.sleep(1)

        print("Waiting for 'Publications (Collection)'...")
        header = page.locator("h3:has-text('Publications (Collection)')")
        if header.count() > 0:
            header.first.scroll_into_view_if_needed()
            print("Found header")
        else:
            print("Collection Header not found")
            return

        print("Looking for Topic radio button...")
        # Find the label "Topic" within the collection section
        # There might be multiple "Topic" labels (one for Collection, one for Delivery potentially)
        # But CollectionSettings comes first in the layout.

        # To be safe, find the container first
        collection_container = page.locator("h3:has-text('Publications (Collection)')").locator("..")

        # Find Topic radio inside
        topic_label = collection_container.locator("label:has-text('Topic')").first
        if topic_label.count() > 0:
            topic_label.click()
            print("Clicked Topic radio button")
        else:
            print("Topic label not found")
            return

        time.sleep(1)

        print("Checking for checkbox...")
        checkbox_text = "Trigger Subscriptions Immediately (Real-time)"
        checkbox_label = collection_container.locator(f"label:has-text('{checkbox_text}')")

        if checkbox_label.count() > 0 and checkbox_label.first.is_visible():
            print("Checkbox found!")
            checkbox_label.first.click() # Toggle it
            # Take screenshot of the Collection Settings area
            page.screenshot(path="verification/collection_settings.png")
            print("Screenshot saved to verification/collection_settings.png")
        else:
            print("Checkbox NOT found or not visible")
            page.screenshot(path="verification/failed_checkbox.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()

with sync_playwright() as p:
    run(p)
