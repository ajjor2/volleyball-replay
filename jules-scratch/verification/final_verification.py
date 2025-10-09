import json
from playwright.sync_api import sync_playwright, Page, expect

# A more complete and valid mock data object
MOCK_GAME_DATA = {
    "match": {
        "match_id": "MOCK123",
        "date": "2025-10-09",
        "time": "18:00",
        "venue_name": "Mock Arena",
        "referee_1_name": "Ref A",
        "attendance": "100",
        "fs_A": 1,
        "fs_B": 0,
        "team_A_id": "A",
        "team_B_id": "B",
        "team_A_name": "Team Alpha",
        "team_B_name": "Team Bravo",
        "lineups": [
            { "player_id": "A1", "team_id": "A", "player_name": "Alice", "shirt_number": "1", "playing_position": { "1": 1 }, "captain": "C" },
            { "player_id": "A2", "team_id": "A", "player_name": "Alan", "shirt_number": "2", "playing_position": { "1": 2 } },
            { "player_id": "A3", "team_id": "A", "player_name": "Anna", "shirt_number": "3", "playing_position": { "1": 3 } },
            { "player_id": "A4", "team_id": "A", "player_name": "Aaron", "shirt_number": "4", "playing_position": { "1": 4 } },
            { "player_id": "A5", "team_id": "A", "player_name": "Amy", "shirt_number": "5", "playing_position": { "1": 5 } },
            { "player_id": "A6", "team_id": "A", "player_name": "Andy", "shirt_number": "6", "playing_position": { "1": 6 } },
            { "player_id": "B1", "team_id": "B", "player_name": "Bob", "shirt_number": "11", "playing_position": { "1": 1 } },
            { "player_id": "B2", "team_id": "B", "player_name": "Bill", "shirt_number": "12", "playing_position": { "1": 2 } },
            { "player_id": "B3", "team_id": "B", "player_name": "Barb", "shirt_number": "13", "playing_position": { "1": 3 } },
            { "player_id": "B4", "team_id": "B", "player_name": "Ben", "shirt_number": "14", "playing_position": { "1": 4 } },
            { "player_id": "B5", "team_id": "B", "player_name": "Beth", "shirt_number": "15", "playing_position": { "1": 5 } },
            { "player_id": "B6", "team_id": "B", "player_name": "Buzz", "shirt_number": "16", "playing_position": { "1": 6 } },
        ],
        "events": [
            { "event_id": "e1", "code": "aloitajakso", "period": "1", "wall_time": "10:00:00" },
            { "event_id": "e2", "code": "aloittavajoukkue", "period": "1", "team_id": "A", "wall_time": "10:00:01" },
            { "event_id": "p1", "code": "piste", "period": "1", "description": "1-0", "team_id": "A", "wall_time": "10:00:10" },
            { "event_id": "p2", "code": "piste", "period": "1", "description": "2-0", "team_id": "A", "wall_time": "10:00:20" },
            { "event_id": "p3", "code": "piste", "period": "1", "description": "2-1", "team_id": "B", "wall_time": "10:00:30" },
            { "event_id": "p4", "code": "piste", "period": "1", "description": "2-2", "team_id": "B", "wall_time": "10:00:40" },
            { "event_id": "p5", "code": "piste", "period": "1", "description": "3-2", "team_id": "A", "wall_time": "10:00:50" },
        ],
        "substitution_events": []
    }
}

def final_verification(page: Page):
    """
    This script verifies both the rotational stats display and the tooltip layout fix.
    It intercepts the local proxy URL and uses complete mock data to ensure stability.
    """
    def handle_route(route):
        print(f"Intercepted proxy request: {route.request.url}")
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"contents": json.dumps(MOCK_GAME_DATA)})
        )

    page.route("**/proxy/get?**", handle_route)

    page.goto("http://localhost:3000/volleyball_replay_v1.html")

    game_url_input = page.get_by_label("Specific Game Data URL (getMatch?match_id=...):")
    game_url_input.fill("https://lentopallo-api.torneopal.net/taso/rest/getMatch?match_id=MOCK_ID")
    page.get_by_role("button", name="Load Game").click()

    advanced_stats_btn = page.get_by_role("button", name="Show Advanced Game Statistics")
    expect(advanced_stats_btn).to_be_enabled(timeout=15000)
    advanced_stats_btn.click()

    # --- Verification 1: Rotational Stats Table ---
    rotational_stats_heading = page.get_by_role("heading", name="Rotational Performance (Point Differential)")
    expect(rotational_stats_heading).to_be_visible()
    rotational_stats_section = page.locator("#advanced-rotational-performance-content")
    expect(rotational_stats_section.get_by_role("heading", name="Team Alpha")).to_be_visible()
    expect(rotational_stats_section.get_by_role("row", name="1 - Alice")).to_be_visible()

    # --- Verification 2: Tooltip Layout ---
    serving_streaks_section = page.locator("#advanced-serving-streaks-section")
    player_cell_to_hover = serving_streaks_section.get_by_role("cell", name="1 - Alice")
    expect(player_cell_to_hover).to_be_visible()
    player_cell_to_hover.hover()

    tooltip = page.locator("#streak-court-tooltip")
    expect(tooltip).to_be_visible()

    expect(tooltip.locator(".player-marker")).to_have_count(12)
    expect(tooltip.locator(".player-marker.serving")).to_be_visible()

    # Take the final screenshot
    page.screenshot(path="jules-scratch/verification/final_verification.png")
    print("Screenshot saved to jules-scratch/verification/final_verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            final_verification(page)
            print("Final frontend verification script ran successfully.")
        except Exception as e:
            print(f"Error during final frontend verification: {e}")
            page.screenshot(path="jules-scratch/verification/error_screenshot.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    main()