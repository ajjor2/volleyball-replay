import asyncio
import re
from playwright.async_api import async_playwright, expect

def log_console_message(msg):
    """Logs browser console messages with their type."""
    print(f"BROWSER CONSOLE ({msg.type}): {msg.text}")

async def main():
    """Main function to run the Playwright test."""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        page.on("console", log_console_message)

        await page.goto("http://localhost:3000/volleyball_replay_v1.html")

        # Use the correct API URL for getMatches, not the public-facing team page URL.
        # The application is designed to fetch from the /rest/getMatches endpoint.
        team_id = "97922" # This is the team ID from the previous incorrect URL.
        api_url = f"https://lentopallo-api.torneopal.net/taso/rest/getMatches?team_id={team_id}"

        await page.get_by_label("Team Matches URL").fill(api_url)
        await page.get_by_role("button", name="Load Team Matches").click()

        # Wait for the first match item to be visible.
        first_match_item = page.locator(".match-list-item").first
        await expect(first_match_item).to_be_visible(timeout=10000) # Increased timeout for network request
        match_id = await first_match_item.get_attribute("data-match-id")

        if match_id:
            # Check for the background loading status indicators.
            status_locator = page.locator(f".match-list-item[data-match-id='{match_id}'] .match-load-status")
            await expect(status_locator).to_have_text("Loading...", timeout=5000)
            await expect(status_locator).to_have_text("Loaded", timeout=30000)
        else:
            print("ERROR: Could not extract match_id from the first match item.")

        await page.screenshot(path="jules-scratch/verification/screenshot.png")
        print("Screenshot saved to jules-scratch/verification/screenshot.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
