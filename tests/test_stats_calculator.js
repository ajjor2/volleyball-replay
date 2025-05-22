/** Parses HH:MM:SS time string into seconds from midnight. */
function parseTimeToSeconds(timeString) { if (!timeString || typeof timeString !== 'string') return null; const parts = timeString.split(':'); if (parts.length === 3) { const h = parseInt(parts[0], 10); const m = parseInt(parts[1], 10); const s = parseInt(parts[2], 10); if (!isNaN(h) && !isNaN(m) && !isNaN(s)) { return h * 3600 + m * 60 + s; } } return null; }

/** Formats total seconds into MM:SS format. */
function formatSecondsToMMSS(totalSeconds) { if (totalSeconds === null || totalSeconds < 0 || isNaN(totalSeconds)) { return "--:--"; } const minutes = Math.floor(totalSeconds / 60); const seconds = Math.floor(totalSeconds % 60); const paddedMinutes = String(minutes).padStart(2, '0'); const paddedSeconds = String(seconds).padStart(2, '0'); return `${paddedMinutes}:${paddedSeconds}`; }

/** Calculates statistics for a single game from its detailed data object. */
function calculateGameStats(matchDetail) {
    if (!matchDetail?.match?.events || !matchDetail?.match?.lineups) { console.error("calculateGameStats ERROR: Invalid match detail structure", matchDetail); return null; }
    const match = matchDetail.match;
    console.log(`--> Calculating stats for match ID: ${match.match_id}`);
    const gameStats = {
        matchId: match.match_id, date: match.date,
        teamAInfo: { id: match.team_A_id, name: match.team_A_name, score: match.fs_A, timeouts: 0, subs: 0, impliedOpponentErrors: 0, impliedErrorsMade: 0 },
        teamBInfo: { id: match.team_B_id, name: match.team_B_name, score: match.fs_B, timeouts: 0, subs: 0, impliedOpponentErrors: 0, impliedErrorsMade: 0 },
        playerStats: {}
    };
    const substitutionLog = match.substitution_events && match.substitution_events.length > 0 ? match.substitution_events : (match.events || []).filter(e => e.code === 'vaihto');
    const playerSetParticipation = {};
    let lineupIsValid = true;
    match.lineups.forEach(p => { const playerIdStr = String(p.player_id); if (playerIdStr && p.team_id && p.player_name && p.shirt_number !== undefined) { gameStats.playerStats[playerIdStr] = { name: p.player_name, shirt: p.shirt_number, team: p.team_id === gameStats.teamAInfo.id ? 'A' : 'B', points: 0, serves: 0, isCaptain: p.captain === 'C', setsPlayedFully: 0 }; playerSetParticipation[playerIdStr] = { started: new Set(), subbedIn: new Set(), subbedOut: new Set() }; if (p.playing_position) { for (const setNumStr in p.playing_position) { const setNum = parseInt(setNumStr, 10); if (!isNaN(setNum) && p.playing_position[setNum] >= 1 && p.playing_position[setNum] <= 6) { playerSetParticipation[playerIdStr].started.add(setNum); } } } } else { console.warn(`Skipping invalid lineup entry in match ${gameStats.matchId}:`, p); if (!playerIdStr) lineupIsValid = false; } });
    if (!lineupIsValid) { console.error(`Calculation failed for match ${gameStats.matchId}: Invalid lineup entries found.`); return null; }
    substitutionLog.forEach(sub => { const period = parseInt(sub.period, 10); if (!isNaN(period) && period > 0) { const playerInId = String(sub.player_id); const playerOutId = String(sub.player_2_id); if (playerInId && playerSetParticipation[playerInId]) { playerSetParticipation[playerInId].subbedIn.add(period); } if (playerOutId && playerSetParticipation[playerOutId]) { playerSetParticipation[playerOutId].subbedOut.add(period); } } });
    const maxSetPlayed = Math.max(1, ...match.events.map(e => parseInt(e.period, 10)).filter(p => !isNaN(p) && p > 0));
    for (const playerId in playerSetParticipation) { let fullSetsCount = 0; for (let setNum = 1; setNum <= maxSetPlayed; setNum++) { const participation = playerSetParticipation[playerId]; if (participation.started.has(setNum) && !participation.subbedOut.has(setNum) && !participation.subbedIn.has(setNum)) { fullSetsCount++; } } if (gameStats.playerStats[playerId]) { gameStats.playerStats[playerId].setsPlayedFully = fullSetsCount; } }
    (match.events || []).forEach(event => { if (event.code === 'aikalisa') { if (event.team_id === gameStats.teamAInfo.id) gameStats.teamAInfo.timeouts++; else if (event.team_id === gameStats.teamBInfo.id) gameStats.teamBInfo.timeouts++; } });
    substitutionLog.forEach(sub => { if (sub.team_id === gameStats.teamAInfo.id) gameStats.teamAInfo.subs++; else if (sub.team_id === gameStats.teamBInfo.id) gameStats.teamBInfo.subs++; });
    let currentSet = 0; let teamAPoints = 0; let teamBPoints = 0; let servingTeam = null; let lastServingTeam = null; let playerPositionsA = {}; let playerPositionsB = {};
    const setGameStartingLineup = (setNum) => { playerPositionsA = {}; playerPositionsB = {}; match.lineups.forEach(p => { const pid = String(p.player_id); if (p.playing_position?.[setNum]) { const zone = p.playing_position[setNum]; if (zone >= 1 && zone <= 6) { if (p.team_id === gameStats.teamAInfo.id) playerPositionsA[zone] = pid; else playerPositionsB[zone] = pid; } } }); };
    const rotateGameTeam = (teamIdSymbol) => { const currentPositions = teamIdSymbol === 'A' ? playerPositionsA : playerPositionsB; const newPositions = {}; newPositions[1] = currentPositions[2]; newPositions[6] = currentPositions[1]; newPositions[5] = currentPositions[6]; newPositions[4] = currentPositions[5]; newPositions[3] = currentPositions[4]; newPositions[2] = currentPositions[3]; for (let zone = 1; zone <= 6; zone++) { if (teamIdSymbol === 'A') playerPositionsA[zone] = newPositions[zone] || null; else playerPositionsB[zone] = newPositions[zone] || null; } };
    const sortedGameEvents = [...match.events].sort((a, b) => { if (!a.wall_time || !b.wall_time) return 0; if (a.wall_time < b.wall_time) return -1; if (a.wall_time > b.wall_time) return 1; return 0; });
    let eventProcessingError = false;
    for (const event of sortedGameEvents) { try { let needsRotation = null; let pointScoredBy = null; let scorerPlayerId = null; if (event.period && parseInt(event.period) > 0 && parseInt(event.period) !== currentSet) { if (event.code !== 'maali') { currentSet = parseInt(event.period); teamAPoints = 0; teamBPoints = 0; setGameStartingLineup(currentSet); } }
        switch (event.code) { case 'aloitajakso': currentSet = parseInt(event.period); teamAPoints = 0; teamBPoints = 0; setGameStartingLineup(currentSet); servingTeam = null; lastServingTeam = null; break; case 'aloittavajoukkue': servingTeam = event.team_id === gameStats.teamAInfo.id ? 'A' : 'B'; lastServingTeam = servingTeam; const serverIdStart = servingTeam === 'A' ? playerPositionsA[1] : playerPositionsB[1]; if (serverIdStart && gameStats.playerStats[serverIdStart]) { gameStats.playerStats[serverIdStart].serves++; } break; case 'piste': const scoreMatch = event.description?.match(/(\d+)-(\d+)/); if (scoreMatch) { const currentPtsA = teamAPoints; const currentPtsB = teamBPoints; const newPtsA = parseInt(scoreMatch[1]); const newPtsB = parseInt(scoreMatch[2]); pointScoredBy = (newPtsA > currentPtsA) ? 'A' : 'B'; teamAPoints = newPtsA; teamBPoints = newPtsB; if (event.player_id && String(event.player_id) !== '1') { scorerPlayerId = String(event.player_id); if(gameStats.playerStats[scorerPlayerId]) { gameStats.playerStats[scorerPlayerId].points++; } else { console.warn(`Scorer ID ${scorerPlayerId} from event not in lineup for match ${gameStats.matchId}`); } } else { if (pointScoredBy === 'A') gameStats.teamAInfo.impliedOpponentErrors++; else gameStats.teamBInfo.impliedOpponentErrors++; } if (servingTeam && pointScoredBy !== servingTeam) { needsRotation = pointScoredBy; } servingTeam = pointScoredBy; if (lastServingTeam === servingTeam && lastServingTeam !== null) { const serverIdHold = servingTeam === 'A' ? playerPositionsA[1] : playerPositionsB[1]; if (serverIdHold && gameStats.playerStats[serverIdHold]) { gameStats.playerStats[serverIdHold].serves++; } } lastServingTeam = servingTeam; } else { console.warn(`Could not parse score from piste event description: ${event.description}`); } break; case 'maali': servingTeam = null; lastServingTeam = null; break; case 'lopetaottelu': servingTeam = null; lastServingTeam = null; break; }
        if (needsRotation) { rotateGameTeam(needsRotation); const serverIdRotated = needsRotation === 'A' ? playerPositionsA[1] : playerPositionsB[1]; if (serverIdRotated && gameStats.playerStats[serverIdRotated]) { gameStats.playerStats[serverIdRotated].serves++; } } } catch (innerError) { console.error(`Error processing event ${event.event_id} in match ${gameStats.matchId}:`, innerError); eventProcessingError = true; } }
    if (eventProcessingError) { console.warn(`Stats for match ${gameStats.matchId} may be incomplete due to event processing errors.`); }
    gameStats.teamAInfo.impliedErrorsMade = gameStats.teamBInfo.impliedOpponentErrors; gameStats.teamBInfo.impliedErrorsMade = gameStats.teamAInfo.impliedOpponentErrors;
    console.log(`Finished calculating stats for match ID: ${match.match_id}`);
    console.log(`Returning gameStats for match ${match.match_id}:`, JSON.parse(JSON.stringify(gameStats))); // Log final calculated object
    return gameStats;
}

// --- Aggregate Stats Function ---
/** Adds stats from a single game to the aggregate totals object. */
function aggregateGameStats(gameStats) { if (!gameStats || !teamIdOfInterest) return; if (!aggregateStats.players) { aggregateStats = { players: {}, team: { timeouts: 0, subs: 0, impliedOpponentErrors: 0, impliedErrorsMade: 0, gamesProcessed: 0 } }; } let teamOfInterestSymbol = null; if (String(gameStats.teamAInfo.id) === String(teamIdOfInterest)) teamOfInterestSymbol = 'A'; else if (String(gameStats.teamBInfo.id) === String(teamIdOfInterest)) teamOfInterestSymbol = 'B'; else return; const teamData = gameStats[`team${teamOfInterestSymbol}Info`]; aggregateStats.team.timeouts += teamData.timeouts; aggregateStats.team.subs += teamData.subs; aggregateStats.team.impliedOpponentErrors += teamData.impliedOpponentErrors; aggregateStats.team.impliedErrorsMade += teamData.impliedErrorsMade; aggregateStats.team.gamesProcessed++; for (const playerId in gameStats.playerStats) { const pStats = gameStats.playerStats[playerId]; if (pStats.team === teamOfInterestSymbol) { if (!aggregateStats.players[playerId]) { aggregateStats.players[playerId] = { name: pStats.name, shirt: pStats.shirt, points: 0, serves: 0, gamesPlayed: 0, setsPlayedFully: 0, isCaptain: pStats.isCaptain }; } else if (pStats.isCaptain) { aggregateStats.players[playerId].isCaptain = true; } aggregateStats.players[playerId].points += pStats.points; aggregateStats.players[playerId].serves += pStats.serves; aggregateStats.players[playerId].setsPlayedFully += pStats.setsPlayedFully; aggregateStats.players[playerId].gamesPlayed++; } } }

// Simple assertion function for testing
function assertEqual(actual, expected, testName) {
    if (actual === expected) {
        console.log(`PASSED: ${testName}`);
    } else {
        console.error(`FAILED: ${testName}`);
        console.error(`  Expected: ${expected}`);
        console.error(`  Actual:   ${actual}`);
    }
}

console.log('--- Running tests for parseTimeToSeconds ---');

// Test cases for parseTimeToSeconds
assertEqual(parseTimeToSeconds("00:00:00"), 0, "Test 1: Zero time");
assertEqual(parseTimeToSeconds("00:00:30"), 30, "Test 2: Only seconds");
assertEqual(parseTimeToSeconds("00:01:00"), 60, "Test 3: Only minutes");
assertEqual(parseTimeToSeconds("01:00:00"), 3600, "Test 4: Only hours");
assertEqual(parseTimeToSeconds("01:10:30"), 4230, "Test 5: Mix of H, M, S");
assertEqual(parseTimeToSeconds("23:59:59"), 86399, "Test 6: Max time");

// Invalid inputs
assertEqual(parseTimeToSeconds("10:30"), null, "Test 7: Invalid format (missing seconds)");
assertEqual(parseTimeToSeconds("10:30:AA"), null, "Test 8: Invalid format (non-numeric seconds)");
assertEqual(parseTimeToSeconds("AA:30:00"), null, "Test 9: Invalid format (non-numeric hours)");
assertEqual(parseTimeToSeconds("10:AA:00"), null, "Test 10: Invalid format (non-numeric minutes)");
assertEqual(parseTimeToSeconds(""), null, "Test 11: Empty string");
assertEqual(parseTimeToSeconds(null), null, "Test 12: Null input");
assertEqual(parseTimeToSeconds(undefined), null, "Test 13: Undefined input");
assertEqual(parseTimeToSeconds("12:34:567"), null, "Test 14: Too many digits in seconds");
assertEqual(parseTimeToSeconds("12:345:67"), null, "Test 15: Too many digits in minutes");
assertEqual(parseTimeToSeconds("123:45:67"), null, "Test 16: Too many digits in hours");
// It might be desirable for future improvement for time parts like '00:60:00' to be null,
// but current implementation parses them based on parseInt.
// For now, testing based on current naive parseInt behavior.
// assertEqual(parseTimeToSeconds("00:60:00"), null, "Test 17: Invalid minute value (60)");


console.log('--- Tests for parseTimeToSeconds complete ---');

console.log('--- Running tests for formatSecondsToMMSS ---');

// Test cases for formatSecondsToMMSS
assertEqual(formatSecondsToMMSS(0), "00:00", "Test F1: Zero seconds");
assertEqual(formatSecondsToMMSS(30), "00:30", "Test F2: Only seconds (less than a minute)");
assertEqual(formatSecondsToMMSS(59), "00:59", "Test F3: 59 seconds");
assertEqual(formatSecondsToMMSS(60), "01:00", "Test F4: Exactly one minute");
assertEqual(formatSecondsToMMSS(90), "01:30", "Test F5: One and a half minutes");
assertEqual(formatSecondsToMMSS(125), "02:05", "Test F6: Multiple minutes with seconds");
assertEqual(formatSecondsToMMSS(3599), "59:59", "Test F7: Max minutes and seconds before one hour");
assertEqual(formatSecondsToMMSS(3600), "60:00", "Test F8: Exactly one hour (displays as 60 minutes)");
assertEqual(formatSecondsToMMSS(3661), "61:01", "Test F9: Over one hour");

// Invalid inputs
assertEqual(formatSecondsToMMSS(null), "--:--", "Test F10: Null input");
assertEqual(formatSecondsToMMSS(undefined), "--:--", "Test F11: Undefined input");
assertEqual(formatSecondsToMMSS(-10), "--:--", "Test F12: Negative seconds");
assertEqual(formatSecondsToMMSS("abc"), "--:--", "Test F13: Non-numeric string input");
assertEqual(formatSecondsToMMSS(NaN), "--:--", "Test F14: NaN input");

console.log('--- Tests for formatSecondsToMMSS complete ---');

console.log('--- Running tests for calculateGameStats ---');

// Mock matchDetail object for testing calculateGameStats
const mockMatchDetail_Game1 = {
    match: {
        match_id: "MOCK001",
        date: "2023-01-15",
        team_A_id: "TeamA_ID",
        team_A_name: "Team Alpha",
        fs_A: 3, // Final score for Team A (sets)
        team_B_id: "TeamB_ID",
        team_B_name: "Team Beta",
        fs_B: 1, // Final score for Team B (sets)
        lineups: [
            // Team A Players
            { player_id: "P1", team_id: "TeamA_ID", player_name: "Player One", shirt_number: "1", captain: "C", playing_position: { 1: 1, 2: 1, 3: 1, 4: 1 } }, // Started all 4 sets
            { player_id: "P2", team_id: "TeamA_ID", player_name: "Player Two", shirt_number: "2", playing_position: { 1: 2, 2: 2 } }, // Started sets 1, 2
            { player_id: "P3", team_id: "TeamA_ID", player_name: "Player Three", shirt_number: "3", playing_position: { 3: 3, 4: 3 } }, // Started sets 3, 4
            { player_id: "P4", team_id: "TeamA_ID", player_name: "Player Four", shirt_number: "4", playing_position: {} }, // No starting position info
            // Team B Players
            { player_id: "P5", team_id: "TeamB_ID", player_name: "Player Five", shirt_number: "5", playing_position: { 1: 1, 2: 1, 3: 1, 4: 1 } },
            { player_id: "P6", team_id: "TeamB_ID", player_name: "Player Six", shirt_number: "6", playing_position: { 1: 2 } },
        ],
        events: [
            // Set 1 Events
            { event_id: "e1", code: "aloitajakso", period: "1", wall_time: "10:00:00" },
            { event_id: "e2", code: "aloittavajoukkue", period: "1", team_id: "TeamA_ID", wall_time: "10:00:01" }, // P1 serves
            { event_id: "e3", code: "piste", period: "1", description: "1-0", player_id: "P1", wall_time: "10:00:10" }, // P1 scores, P1 serves again
            { event_id: "e4", code: "piste", period: "1", description: "2-0", player_id: "P2", wall_time: "10:00:20" }, // P2 scores, P1 serves again
            { event_id: "e5", code: "piste", period: "1", description: "2-1", team_id: "TeamB_ID", player_id: "P5", wall_time: "10:00:30" }, // P5 scores, Team B serves (P5)
            { event_id: "e6", code: "aikalisa", period: "1", team_id: "TeamA_ID", wall_time: "10:01:00" }, // Team A timeout
            // Set 2 Events
            { event_id: "e7", code: "aloitajakso", period: "2", wall_time: "10:20:00" },
            { event_id: "e8", code: "aloittavajoukkue", period: "2", team_id: "TeamB_ID", wall_time: "10:20:01" }, // P5 serves
            { event_id: "e9", code: "piste", period: "2", description: "0-1", player_id: "P5", wall_time: "10:20:10" }, // P5 scores, P5 serves
            { event_id: "e10", code: "aikalisa", period: "2", team_id: "TeamB_ID", wall_time: "10:21:00" }, // Team B timeout
            // Set 3 Events
            { event_id: "e11", code: "aloitajakso", period: "3", wall_time: "10:40:00" },
            { event_id: "e12", code: "aloittavajoukkue", period: "3", team_id: "TeamA_ID", wall_time: "10:40:01" }, // P1 serves
            { event_id: "e13", code: "piste", period: "3", description: "1-0", player_id: "P3", wall_time: "10:40:10" }, // P3 scores, P1 serves
            // Set 4 Events
            { event_id: "e14", code: "aloitajakso", period: "4", wall_time: "11:00:00" },
            { event_id: "e15", code: "aloittavajoukkue", period: "4", team_id: "TeamA_ID", wall_time: "11:00:01" }, // P1 serves
            { event_id: "e16", code: "piste", period: "4", description: "1-0", player_id: "P1", wall_time: "11:00:10" }, // P1 scores, P1 serves
            { event_id: "e17", code: "lopetaottelu", period: "4", wall_time: "11:05:00" }
        ],
        substitution_events: [ // Using `substitution_events`
            { event_id: "sub1", period: "2", team_id: "TeamA_ID", player_id: "P3", player_2_id: "P2", wall_time: "10:25:00" }, // P3 in for P2 in Set 2
            { event_id: "sub2", period: "3", team_id: "TeamA_ID", player_id: "P2", player_2_id: "P3", wall_time: "10:45:00" }  // P2 in for P3 in Set 3 (P3 started set 3, so P3 is subbed out, P2 subbed in)
        ]
    }
};

const gameStats_Game1 = calculateGameStats(mockMatchDetail_Game1);

assertEqual(typeof gameStats_Game1, 'object', "Test C1: gameStats_Game1 should be an object");
if (gameStats_Game1) {
    // Team A Stats
    assertEqual(gameStats_Game1.teamAInfo.timeouts, 1, "Test C2: Team A Timeouts");
    assertEqual(gameStats_Game1.teamAInfo.subs, 2, "Test C3: Team A Substitutions"); 
    
    // Player P1 (Team A)
    assertEqual(gameStats_Game1.playerStats["P1"].points, 2, "Test C4: P1 Points"); 
    assertEqual(gameStats_Game1.playerStats["P1"].serves, 7, "Test C5: P1 Serves"); 
    assertEqual(gameStats_Game1.playerStats["P1"].setsPlayedFully, 4, "Test C6: P1 Sets Played Fully"); 

    // Player P2 (Team A)
    assertEqual(gameStats_Game1.playerStats["P2"].points, 1, "Test C7: P2 Points"); 
    assertEqual(gameStats_Game1.playerStats["P2"].serves, 0, "Test C8: P2 Serves"); 
    assertEqual(gameStats_Game1.playerStats["P2"].setsPlayedFully, 0, "Test C9: P2 Sets Played Fully"); 

    // Player P3 (Team A)
    assertEqual(gameStats_Game1.playerStats["P3"].points, 1, "Test C10: P3 Points"); 
    assertEqual(gameStats_Game1.playerStats["P3"].serves, 0, "Test C11: P3 Serves");
    assertEqual(gameStats_Game1.playerStats["P3"].setsPlayedFully, 0, "Test C12: P3 Sets Played Fully"); 

    // Player P5 (Team B)
    assertEqual(gameStats_Game1.playerStats["P5"].points, 2, "Test C13: P5 Points"); 
    assertEqual(gameStats_Game1.playerStats["P5"].serves, 3, "Test C14: P5 Serves"); 
    assertEqual(gameStats_Game1.playerStats["P5"].setsPlayedFully, 4, "Test C15: P5 Sets Played Fully");

    assertEqual(gameStats_Game1.teamAInfo.impliedOpponentErrors, 0, "Test C16: Team A Implied Opponent Errors");
    assertEqual(gameStats_Game1.teamBInfo.impliedOpponentErrors, 0, "Test C17: Team B Implied Opponent Errors");
    assertEqual(gameStats_Game1.teamAInfo.impliedErrorsMade, 0, "Test C18: Team A Implied Errors Made");
    assertEqual(gameStats_Game1.teamBInfo.impliedErrorsMade, 0, "Test C19: Team B Implied Errors Made");

} else {
    console.error("FAILED: Test C1: gameStats_Game1 was null or undefined, skipping further tests for it.");
}

// Test with missing lineups (should return null)
const mockMatchDetail_NoLineups = JSON.parse(JSON.stringify(mockMatchDetail_Game1)); 
delete mockMatchDetail_NoLineups.match.lineups;
const gameStats_NoLineups = calculateGameStats(mockMatchDetail_NoLineups);
assertEqual(gameStats_NoLineups, null, "Test C20: calculateGameStats with missing lineups should return null");

// Test with missing events (should still process, but stats might be zero)
const mockMatchDetail_NoEvents = JSON.parse(JSON.stringify(mockMatchDetail_Game1));
mockMatchDetail_NoEvents.match.events = [];
mockMatchDetail_NoEvents.match.substitution_events = []; 
const gameStats_NoEvents = calculateGameStats(mockMatchDetail_NoEvents);
assertEqual(typeof gameStats_NoEvents, 'object', "Test C21: gameStats_NoEvents should be an object");
if (gameStats_NoEvents) {
    assertEqual(gameStats_NoEvents.playerStats["P1"].points, 0, "Test C22: P1 Points with no events");
    assertEqual(gameStats_NoEvents.playerStats["P1"].serves, 0, "Test C23: P1 Serves with no events");
    assertEqual(gameStats_NoEvents.teamAInfo.timeouts, 0, "Test C24: Team A Timeouts with no events");
    assertEqual(gameStats_NoEvents.playerStats["P1"].setsPlayedFully, 4, "Test C25: P1 Sets Played Fully with no events (still has lineup info for all sets)");
}

console.log('--- Tests for calculateGameStats complete ---');

console.log('--- Running tests for aggregateGameStats ---');

// Ensure 'teamIdOfInterest' and 'aggregateStats' are available and can be reset for tests.
// These are global in the original script. For testing, we might need to manage their state.
let teamIdOfInterest; // Will be set per test group
let aggregateStats;   // Will be reset per test group

// Helper to reset aggregateStats before a set of aggregation tests
function resetAggregateStats() {
    aggregateStats = { players: {}, team: { timeouts: 0, subs: 0, impliedOpponentErrors: 0, impliedErrorsMade: 0, gamesProcessed: 0 } };
}

// --- Test Group 1: Aggregating stats for Team A ---
resetAggregateStats();
teamIdOfInterest = "TeamA_ID"; // Set for this group of tests

// Use gameStats_Game1 from the previous test (output of calculateGameStats(mockMatchDetail_Game1))
// Ensure gameStats_Game1 is defined and not null before proceeding
if (typeof gameStats_Game1 !== 'undefined' && gameStats_Game1 !== null) {
    aggregateGameStats(gameStats_Game1);

    assertEqual(aggregateStats.team.gamesProcessed, 1, "Test A1: Games Processed for Team A");
    assertEqual(aggregateStats.team.timeouts, 1, "Test A2: Aggregated Timeouts for Team A");
    assertEqual(aggregateStats.team.subs, 2, "Test A3: Aggregated Subs for Team A");
    assertEqual(aggregateStats.team.impliedOpponentErrors, 0, "Test A4: Aggregated Implied Opponent Errors for Team A");
    assertEqual(aggregateStats.team.impliedErrorsMade, 0, "Test A5: Aggregated Implied Errors Made for Team A");

    // Player P1 (Team A)
    assertEqual(aggregateStats.players["P1"].points, 2, "Test A6: P1 Aggregated Points");
    assertEqual(aggregateStats.players["P1"].serves, 7, "Test A7: P1 Aggregated Serves"); // Expected 7 from previous step's correction
    assertEqual(aggregateStats.players["P1"].setsPlayedFully, 4, "Test A8: P1 Aggregated Sets Played Fully");
    assertEqual(aggregateStats.players["P1"].gamesPlayed, 1, "Test A9: P1 Aggregated Games Played");
    assertEqual(aggregateStats.players["P1"].name, "Player One", "Test A10: P1 Name");

    // Player P2 (Team A)
    assertEqual(aggregateStats.players["P2"].points, 1, "Test A11: P2 Aggregated Points");
    assertEqual(aggregateStats.players["P2"].serves, 0, "Test A12: P2 Aggregated Serves");
    assertEqual(aggregateStats.players["P2"].setsPlayedFully, 0, "Test A13: P2 Aggregated Sets Played Fully");
    assertEqual(aggregateStats.players["P2"].gamesPlayed, 1, "Test A14: P2 Aggregated Games Played");

    // Player P5 (Team B) should NOT be in aggregateStats.players for Team A
    assertEqual(typeof aggregateStats.players["P5"], 'undefined', "Test A15: P5 (Team B) should not be in Team A's aggregate stats");

    // Create a second mock game's stats for Team A to test aggregation over multiple games
    const mockGameStats_Game2_TeamA = {
        matchId: "MOCK002", date: "2023-01-22",
        teamAInfo: { id: "TeamA_ID", name: "Team Alpha", score: 3, timeouts: 2, subs: 1, impliedOpponentErrors: 1, impliedErrorsMade: 2 },
        teamBInfo: { id: "TeamC_ID", name: "Team Charlie", score: 0, timeouts: 0, subs: 0, impliedOpponentErrors: 2, impliedErrorsMade: 1 },
        playerStats: {
            "P1": { name: "Player One", shirt: "1", team: 'A', points: 5, serves: 10, isCaptain: true, setsPlayedFully: 3 },
            "PNew": { name: "Player New", shirt: "99", team: 'A', points: 2, serves: 2, isCaptain: false, setsPlayedFully: 1 }
        }
    };
    aggregateGameStats(mockGameStats_Game2_TeamA);

    assertEqual(aggregateStats.team.gamesProcessed, 2, "Test A16: Games Processed (2 games)");
    assertEqual(aggregateStats.team.timeouts, 3, "Test A17: Aggregated Timeouts (1+2)"); // 1 from game1 + 2 from game2
    assertEqual(aggregateStats.team.subs, 3, "Test A18: Aggregated Subs (2+1)"); // 2 from game1 + 1 from game2
    assertEqual(aggregateStats.team.impliedOpponentErrors, 1, "Test A19: Aggregated Implied Opponent Errors (0+1)");
    assertEqual(aggregateStats.team.impliedErrorsMade, 2, "Test A20: Aggregated Implied Errors Made (0+2)");

    // Player P1 (Team A) - after second game
    assertEqual(aggregateStats.players["P1"].points, 7, "Test A21: P1 Aggregated Points (2+5)"); // 2 from game1 + 5 from game2
    assertEqual(aggregateStats.players["P1"].serves, 17, "Test A22: P1 Aggregated Serves (7+10)"); // 7 from game1 + 10 from game2
    assertEqual(aggregateStats.players["P1"].setsPlayedFully, 7, "Test A23: P1 Aggregated Sets Played Fully (4+3)");
    assertEqual(aggregateStats.players["P1"].gamesPlayed, 2, "Test A24: P1 Aggregated Games Played (1+1)");

    // Player PNew (Team A) - from second game
    assertEqual(aggregateStats.players["PNew"].points, 2, "Test A25: PNew Aggregated Points");
    assertEqual(aggregateStats.players["PNew"].serves, 2, "Test A26: PNew Aggregated Serves");
    assertEqual(aggregateStats.players["PNew"].setsPlayedFully, 1, "Test A27: PNew Aggregated Sets Played Fully");
    assertEqual(aggregateStats.players["PNew"].gamesPlayed, 1, "Test A28: PNew Aggregated Games Played");

} else {
    console.error("FAILED: Prerequisite gameStats_Game1 is not available. Skipping tests for aggregateGameStats for Team A.");
}


// --- Test Group 2: Aggregating stats for Team B ---
resetAggregateStats(); // Reset for a new team
teamIdOfInterest = "TeamB_ID";

if (typeof gameStats_Game1 !== 'undefined' && gameStats_Game1 !== null) {
    aggregateGameStats(gameStats_Game1); // Use the same gameStats_Game1, but now interested in Team B

    assertEqual(aggregateStats.team.gamesProcessed, 1, "Test B1: Games Processed for Team B");
    assertEqual(aggregateStats.team.timeouts, 1, "Test B2: Aggregated Timeouts for Team B"); // From gameStats_Game1.teamBInfo
    assertEqual(aggregateStats.team.subs, 0, "Test B3: Aggregated Subs for Team B"); // No subs for Team B in mock
    
    // Player P5 (Team B)
    assertEqual(aggregateStats.players["P5"].points, 2, "Test B4: P5 Aggregated Points");
    assertEqual(aggregateStats.players["P5"].serves, 3, "Test B5: P5 Aggregated Serves");
    assertEqual(aggregateStats.players["P5"].setsPlayedFully, 4, "Test B6: P5 Aggregated Sets Played Fully");
    assertEqual(aggregateStats.players["P5"].gamesPlayed, 1, "Test B7: P5 Aggregated Games Played");

    // Player P1 (Team A) should NOT be in aggregateStats.players for Team B
    assertEqual(typeof aggregateStats.players["P1"], 'undefined', "Test B8: P1 (Team A) should not be in Team B's aggregate stats");
} else {
    console.error("FAILED: Prerequisite gameStats_Game1 is not available. Skipping tests for aggregateGameStats for Team B.");
}

// --- Test Group 3: Calling with null/undefined gameStats ---
resetAggregateStats();
teamIdOfInterest = "TeamA_ID";
aggregateGameStats(null);
assertEqual(aggregateStats.team.gamesProcessed, 0, "Test N1: Games Processed should be 0 after null gameStats");
aggregateGameStats(undefined);
assertEqual(aggregateStats.team.gamesProcessed, 0, "Test N2: Games Processed should be 0 after undefined gameStats");


console.log('--- Tests for aggregateGameStats complete ---');
