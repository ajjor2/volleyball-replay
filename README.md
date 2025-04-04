# Volleyball Game Replay App

## Description
I am just trying out different LLMs for reading API and making simple app.

This web application visualizes volleyball game replays based on detailed statistical data provided in a specific JSON format. It allows users to load game data from a URL (primarily tested with data from `lentopallo-api.torneopal.net`) and step through the match event by event, observing player rotations, score changes, and basic statistics.

This application was developed iteratively based on specific data structures and user requests.

## Features

* **Load Data via URL:** Input field to paste a URL pointing to the game's JSON data (e.g., from `lentopallo-api.torneopal.net/taso/rest/getMatch?match_id=...`). Includes basic URL and data structure validation.
* **Scoreboard Display:** Shows the current set number, running point score for both teams, and the overall sets won score.
* **Match Information:** Displays basic match details like Date, Time, Venue, Referee, and Attendance below the scoreboard.
* **Court Visualization:**
    * Top-down view of the volleyball court.
    * Displays player markers (with shirt numbers) in their correct zones based on standard rotations.
    * Highlights the serving player.
    * Provides a temporary, enhanced highlight for the player who scored the point (when specified in the data).
    * Provides a temporary background flash for the court side of the team that lost a point when the scorer isn't specified (potentially indicating an error).
* **Event Log:** Shows a text description of the current event being displayed (e.g., "Point: 5-4", "Timeout: Team A", "Set 2 Start").
* **Playback Controls:**
    * **Previous/Next Event:** Step backward or forward through game events.
    * **Play/Pause:** Automatically advance through events at a set interval (currently 1.5 seconds).
    * **Skip to End:** Quickly process all remaining events to show the final stats and game state.
* **Statistics Display:**
    * **Player Stats (Running):** Shows Points Scored and Serves Performed by each player, calculated up to the current point in the replay. Also indicates the Team Captain (C).
    * **Team Summary Stats:** Shows total Timeouts Used, total Substitutions Made, and "Opponent Errors (Implied)" (points gained when the opponent scored without a specific player ID being logged).

## How to Use

1.  **Running the App:**
    * Host the `volleyball-replay-app-v1.html` file on a static web hosting provider (see Hosting section below).
    * Alternatively, open the HTML file directly in your web browser (though fetching data via URL might be blocked by CORS in this case).
2.  **Loading Data:**
    * Find the URL for the game data JSON. For the Torneopal API, this looks like `https://lentopallo-api.torneopal.net/taso/rest/getMatch?match_id=YOUR_MATCH_ID&timeStamp=...`.
    * Paste the full URL into the "Game Data URL" input field.
    * Click the "Load Game" button.
    * Check the status message below the input field for success or error information.
3.  **Controlling the Replay:**
    * Once data is loaded, use the "Previous Event", "Play"/"Pause", "Next Event", and "Skip to End" buttons to navigate through the game.

## Technology Stack

* **HTML:** Structure of the application.
* **CSS:** Styling using **Tailwind CSS** (loaded via CDN).
* **JavaScript:** Core logic for data processing, state management, replay control, and UI updates (no external libraries).

## Limitations & Known Issues

* **CORS (Cross-Origin Resource Sharing):** Fetching data directly from the API URL using the "Load Game" button **may fail** due to browser security restrictions (CORS) if the API server doesn't explicitly allow requests from the domain where the app is hosted.
    * **Workaround:** For reliable public use, a proxy server would be needed. For personal use, you could manually save the JSON data to a local `.js` file and modify the script to load from there, or use browser tools to temporarily disable CORS (not recommended). Refer to the `hosting-options` document for more details.
* **Data Format Dependency:** The application is specifically designed to parse the JSON structure provided by the `lentopallo-api.torneopal.net` source. It will likely **not** work with data from other sources or in different formats without significant code modifications.
* **Stats Accuracy:**
    * "Opponent Errors (Implied)" is an *estimation* based on points scored where the data source didn't specify the scoring player. It's not a guaranteed error count.
    * Running stats (points, serves) depend on the correct and complete processing of all game events.
* **"Previous" Button:** The current implementation uses a basic state history. While functional, going back many steps in very long games might be slightly inefficient or could encounter edge cases if the state saving/restoring needs refinement.
* **Libero Tracking:** Full libero movement and substitution rules are not currently implemented in the visualization.

## Potential Future Enhancements

* Implement detailed libero tracking and visualization.
* Visually indicate substitutions on the court or in the event log.
* Add support for loading data from local files.
* Improve error handling for unexpected data variations.
* Refactor the "Previous" button logic for better performance using state diffing or reversible actions.
* Add UI options for controlling playback speed.
