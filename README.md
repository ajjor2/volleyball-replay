# Volleyball Replay & Stats Apps

## Project Description

This repository contains two related single-page web applications for visualizing and analyzing volleyball match statistics, primarily designed to work with data fetched from the `lentopallo-api.torneopal.net` API.

1.  **Single-Game Replay App:** Allows loading detailed data for a single match and replaying it event-by-event with court visualization and running stats.
2.  **Team Stats Aggregator App:** Takes a team's match list URL, fetches data for all played games in that list, calculates key statistics for each game, and displays both per-game summaries and aggregated season totals for the specified team. It also includes advanced statistics like rally durations and side-out percentages.

## 1. Single-Game Replay App (`volleyball_replay_v1.html`)

### Description

This tool provides a visual step-by-step replay of a single volleyball match using its detailed event log data.

### Features

*   **Game Loading**:
    *   Load a team's match list from a `getMatches` URL and select a game.
    *   Load a single game directly from a `getMatch` URL.
*   **Replay & Visualization**:
    *   Displays scoreboard (sets, points) and detailed match info.
    *   Visualizes player positions on a 2D court, updating with rotations.
    *   Highlights the serving player and provides a temporary, enhanced highlight for the point scorer.
    *   Shows a text description of the current event and elapsed time within the set.
*   **Playback Controls**: Previous Event, Next Event, Play/Pause (auto-advances), Skip to End.
*   **Basic Stats**: Displays running stats per player (Points, Serves) and team summary stats (Timeouts, Subs, Implied Errors).
*   **Advanced Statistics**:
    *   **Rally Analysis**: Generates bar charts for rally durations (all rallies and player-scored rallies) and provides statistical summaries (mean, median, range, std. deviation).
    *   **Detailed Game Breakdown**: A toggleable section shows advanced metrics like:
        *   Set Summaries (scores, duration, winner).
        *   Side-Out Percentages.
        *   Longest Point Runs.
        *   Player Points Per Set.
        *   Lead Changes & Max Leads per set.
        *   Performance after Timeouts.
        *   Longest Serving Streaks.
        *   Points on Serve vs. Reception.
        *   Average Points per Service Turn.

### How to Use

1.  Host the `volleyball-replay-app-v1.html` file or open it directly in a browser.
2.  **Option A (Recommended):** Find a team's `getMatches` URL (e.g., `.../getMatches?team_id=12345`). Paste it into the "Team Matches URL" input and click "Load Team Matches". Click on a "Played" game from the list that appears.
3.  **Option B:** Find a specific `getMatch` URL (e.g., `.../getMatch?match_id=701913`). Paste it into the "Specific Game Data URL" input and click "Load Game".
4.  Use the playback controls to navigate the replay.
5.  After loading a game, click "Show Advanced Game Statistics" to view the detailed analysis.

## 2. Team Stats Aggregator App (`Team_Season_Statistics_Aggregator.html`)

### Description

This tool fetches a list of matches for a specific team, processes all completed games from that list using a dedicated `stats_calculator.js` module, and displays both per-game and aggregated season statistics for that team.

### Features

*   Loads a list of matches from a provided `getMatches` URL (requires a `team_id` parameter).
*   Displays the list of found matches and their corresponding `getMatch` API URLs.
*   Automatically fetches detailed data for each match marked as "Played".
*   **Calculates Per-Game Stats** for the specified team:
    *   Player Points & Serves for that game.
    *   Player "Full Sets Played" (defined as starting a set and not being substituted out).
    *   Team Timeouts & Total Substitutions for that game.
    *   "Opponent Errors (Implied)" (Points gained where the opponent was the implied source of the error).
    *   "Implied Errors Made" (Points lost where the team was the implied source of the error).
*   Displays a separate, clear summary table for each processed game.
*   **Calculates and Displays Aggregate Season Totals** for the specified team:
    *   Total Points, Serves, Games Played, and Full Sets Played per player.
    *   Average Points per Full Set and Serves per Full Set per player.
    *   Total Team Timeouts, Subs, Implied Opponent Errors, and Implied Errors Made across all processed games.

### How to Use

1.  Host the `Team_Season_Statistics_Aggregator.html` file or open it directly in a browser.
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

## Run locally (development)

The project includes a tiny Node static server with a proxy to avoid browser CORS issues when fetching the remote API. You'll need Node.js (which provides `node` and `npm`) installed.

PowerShell example commands:

```powershell
# Start the local server (serves files and provides /proxy endpoints)
npm start

# Open the app in your browser:
# http://localhost:3000/  (defaults to volleyball_replay_v1.html)

# Run the JS tests (no dependencies required):
npm test
```

Notes:
- The server exposes two proxy endpoints useful for the app when run from localhost:
    - `/proxy/get?url=<encoded_url>` — returns a JSON object { contents: string } similar to allorigins.win/get
    - `/proxy/raw?url=<encoded_url>` — returns the raw response body (useful when the resource is already JSON)
- If `npm` is not available on your machine, install Node.js from https://nodejs.org/ (LTS recommended).

## GitHub Pages Deployment

This repository includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that publishes the site's static files to GitHub Pages on pushes to `main` or when manually triggered.

How it works:
- The workflow copies the top-level `*.html`, the `js/` folder and other asset folders into a `public/` directory.
- It uploads the `public/` artifact and then uses `actions/deploy-pages` to publish the site to the repository's Pages site.

After the first successful run, your site will be available at:
```
https://<your-github-username>.github.io/<repository-name>/
```

For example (this repo): `https://ajjor2.github.io/volleyball-replay`.

Triggering the deployment:
- Push to `main`:
    - Commit and push your changes. The workflow will run and deploy when complete.
- Or use the "Run workflow" button in the Actions tab to manually dispatch the workflow.

If you want to only publish a subset of files or a different path, edit the `deploy-pages.yml` workflow `Prepare public directory` step.

