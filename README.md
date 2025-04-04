# Volleyball Replay & Stats Apps

## Project Description

This repository contains two related single-page web applications for visualizing and analyzing volleyball match statistics, primarily designed to work with data fetched from the `lentopallo-api.torneopal.net` API.

1.  **Single-Game Replay App:** Allows loading detailed data for a single match and replaying it event-by-event with court visualization and running stats.
2.  **Team Stats Aggregator App:** Takes a team's match list URL, fetches data for all played games in that list, calculates key statistics for each game, and displays both per-game summaries and aggregated season totals for the specified team.

## 1. Single-Game Replay App (`volleyball-replay-app-v1.html`)

### Description

This tool provides a visual step-by-step replay of a single volleyball match using its detailed event log data.

### Features

* Loads game data from a provided `getMatch` URL.
* Displays scoreboard (sets, points).
* Visualizes player positions on a 2D court based on standard rotations.
* Highlights the serving player.
* Provides a temporary, enhanced highlight for the point scorer (when specified in the data).
* Shows a text description of the current event.
* Playback Controls: Previous Event, Next Event, Play/Pause (auto-advances ~1.5s per event), Skip to End.
* Displays running stats per player (Points, Serves) updated during the replay.
* Displays team summary stats (Timeouts Used, Total Subs, "Opponent Errors (Implied)", "Implied Errors Made").
* Shows basic match info (Venue, Referee, Attendance, Date, Time).
* Displays elapsed time within the current set.

### How to Use

1.  Host the `volleyball-replay-app-v1.html` file or open it directly in a browser.
2.  Find the `getMatch` URL for the desired game (e.g., `https://lentopallo-api.torneopal.net/taso/rest/getMatch?match_id=701913&timeStamp=...`).
3.  Paste the URL into the "Game Data URL" input field.
4.  Click "Load Game".
5.  Use the playback controls (Previous, Play/Pause, Next, Skip to End) to navigate the replay.

*(Note: This app evolved from an earlier version that used embedded data. The final version described here uses URL loading).*

## 2. Team Stats Aggregator App (`team-stats-app.html`)

### Description

This tool fetches a list of matches for a specific team, processes all completed games from that list, and calculates/displays both per-game and aggregated season statistics for that team.

### Features

* Loads a list of matches from a provided `getMatches` URL (requires a `team_id` parameter).
* Displays the list of found matches and constructs clickable `getMatch` URLs for each.
* Automatically fetches detailed data for each match marked as "Played".
* Calculates per-game stats for the specified team:
    * Player Points & Serves for that game.
    * Player "Full Sets Played" (based on starting and not being subbed in/out).
    * Team Timeouts & Total Substitutions for that game.
    * "Opponent Errors (Implied)" (Points gained from opponent's unspecified scores).
    * "Implied Errors Made" (Points lost from own unspecified scores).
* Displays a separate summary table for each processed game.
* Calculates and displays aggregate season totals for the specified team:
    * Total Points, Serves, Games Played, Full Sets Played per player.
    * Average Points per Full Set and Serves per Full Set per player.
    * Total Team Timeouts, Subs, Implied Opponent Errors, Implied Errors Made across processed games.

### How to Use

1.  Host the `team-stats-app.html` file or open it directly in a browser.
2.  Find the `getMatches` URL for the desired team (e.g., `https://lentopallo-api.torneopal.net/taso/rest/getMatches?team_id=50538`).
3.  Paste the URL into the "Team Matches URL" input field.
4.  Click "Load & Calculate Stats".
5.  The app will display the list of found matches and their URLs.
6.  It will then automatically fetch and process the "Played" games, displaying the per-game stats followed by the aggregate season stats table. This may take some time depending on the number of games.

## Technology Stack (Both Apps)

* **HTML:** Structure
* **CSS:** Styling via **Tailwind CSS** (loaded from CDN)
* **JavaScript:** Application logic (fetching, calculation, DOM manipulation) - no external libraries.

## Important Limitations (Both Apps)

* **CORS (Cross-Origin Resource Sharing):** Fetching data directly from `lentopallo-api.torneopal.net` using the URL inputs **will likely fail** in most browsers when the HTML file is hosted on a different domain (like GitHub Pages) or opened locally. This is due to browser security policies. The API server must explicitly allow requests from the app's origin.
    * **Workaround:** Use a proxy server or manually download JSON data and modify the script to load locally (for personal use).
* **Data Format Dependency:** Both apps are tightly coupled to the specific JSON structure returned by the `lentopallo-api.torneopal.net` API endpoints (`getMatch` and `getMatches`). They will likely fail if the API structure changes or if used with data from a different source.
* **Data Completeness/Accuracy:** The accuracy of calculated stats depends entirely on the completeness and correctness of the source JSON data (e.g., presence of `playing_position`, `substitution_events`, valid `wall_time` for all events, correct scorer IDs in `piste` events). The "not working" examples highlighted issues with missing/inconsistent data.
* **"Implied Errors":** The "Opponent Errors (Implied)" and "Implied Errors Made" stats are proxies based on points scored where the specific scoring player ID was missing. They are *not* a definitive count of actual errors.
* **Libero Tracking:** Calculations involving substitutions or "Full Sets Played" may not be accurate for Liberos due to their unique substitution rules not being fully tracked/interpreted.

## Hosting Notes

* You can host either `volleyball-replay-app-v1.html` or `team-stats-app.html` (or both, perhaps renaming one to `index.html`) using static hosting providers like GitHub Pages, Netlify, Vercel etc.
* Refer to the `github-pages-viewing` document for steps on setting up GitHub Pages.
* Remember that hosting the file **does not solve the CORS issue** for data loading via URL.
