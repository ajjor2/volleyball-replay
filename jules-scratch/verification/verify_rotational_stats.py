import json
from playwright.sync_api import sync_playwright, Page, expect

# Mock data based on tests/test_rotational_stats.js
MOCK_GAME_DATA = {
    "match": {
        "team_A_id": "A",
        "team_B_id": "B",
        "team_A_name": "Team Alpha",
        "team_B_name": "Team Bravo",
        "lineups": [
            { "player_id": "A1", "team_id": "A", "player_name": "Alice", "shirt_number": "1", "playing_position": { "1": 1 } },
            { "player_id": "A2", "team_id": "A", "player_name": "Alan", "shirt_number": "2", "playing_position": { "1": 2 } },
            { "player_id": "B1", "team_id": "B", "player_name": "Bob", "shirt_number": "11", "playing_position": { "1": 1 } },
            { "player_id": "B2", "team_id": "B", "player_name": "Bill", "shirt_number": "12", "playing_position": { "1": 2 } },
        ],
        "events": [
            { "event_id": "e1", "code": "aloitajakso", "period": "1", "wall_time": "10:00:00" },
            { "event_id": "e2", "code": "aloittavajoukkue", "period": "1", "team_id": "A", "wall_time": "10:00:01" },
            { "event_id": "p1", "code": "piste", "period": "1", "description": "1-0", "team_id": "A", "wall_time": "10:00:10" },
            { "event_id": "p2", "code": "piste", "period": "1", "description": "2-0", "team_id": "A", "wall_time": "10:00:20" },
            { "event_id": "p3", "code": "piste", "period": "1", "description": "2-1", "team_id": "B", "wall_time": "10:00:30" },
            { "event_id": "p4", "code": "piste", "period": "1", "description": "2-2", "team_id": "B", "wall_time": "10:00:40" },
            { "event_id": "p5", "code": "piste", "period": "1", "description": "3-2", "team_id": "A", "wall_time": "10:00:50" },
            { "event_id": "p6", "code": "piste", "period": "1", "description": "3-3", "team_id": "B", "wall_time": "10:01:00" },
        ],
        "substitution_events": []
    }
}

def verify_rotational_stats_display(page: Page):
    """
    This script verifies that the 'Rotational Performance' table is
    correctly displayed in the advanced stats section.
    """
    def handle_route(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(MOCK_GAME_DATA)
        )
    page.route("**/getMatch?**", handle_route)

    page.goto("http://localhost:3000/volleyball_replay_v1.html")

    game_url_input = page.get_by_label("Specific Game Data URL (getMatch?match_id=...):")
    game_url_input.fill("https://lentopallo-api.torneopal.net/taso/rest/getMatch?match_id=MOCK_ID")
    page.get_by_role("button", name="Load Game").click()

    advanced_stats_btn = page.get_by_role("button", name="Show Advanced Game Statistics")
    expect(advanced_stats_btn).to_be_enabled(timeout=10000)
    advanced_stats_btn.click()

    rotational_stats_heading = page.get_by_role("heading", name="Rotational Performance (Point Differential)")
    expect(rotational_stats_heading).to_be_visible()

    rotational_stats_section = page.locator("#advanced-rotational-performance-content")

    # Verify Team Alpha's table
    team_alpha_header = rotational_stats_section.get_by_role("heading", name="Team Alpha")
    expect(team_alpha_header).to_be_visible()
    alice_row = rotational_stats_section.get_by_role("row", name="1 - Alice")
    expect(alice_row.get_by_role("cell").nth(3)).to_have_text("+1") # Differential for Alice

    # Verify Team Bravo's table
    team_bravo_header = rotational_stats_section.get_by_role("heading", name="Team Bravo")
    expect(team_bravo_header).to_be_visible()
    bill_row = rotational_stats_section.get_by_role("row", name="12 - Bill")
    expect(bill_row.get_by_role("cell").nth(3)).to_have_text("+1") # Differential for Bill

    page.screenshot(path="jules-scratch/verification/rotational_stats_display.png")
    print("Screenshot saved to jules-scratch/verification/rotational_stats_display.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_rotational_stats_display(page)
            print("Frontend verification script ran successfully.")
        except Exception as e:
            print(f"Error during frontend verification: {e}")
            page.screenshot(path="jules-scratch/verification/error_screenshot.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    main()