/** Parses HH:MM:SS time string into seconds from midnight. */
export function parseTimeToSeconds(timeString) { 
    if (!timeString || typeof timeString !== 'string') return null; 
    const parts = timeString.split(':'); 
    if (parts.length === 3) { 
        if (parts[0].length > 2 || parts[1].length > 2 || parts[2].length > 2) return null; // Check length of parts
        const h = parseInt(parts[0], 10); 
        const m = parseInt(parts[1], 10); 
        const s = parseInt(parts[2], 10); 
        if (!isNaN(h) && !isNaN(m) && !isNaN(s) && 
            h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) { // Check ranges
            return h * 3600 + m * 60 + s; 
        } 
    } 
    return null; 
}

/** Formats total seconds into MM:SS format. */
export function formatSecondsToMMSS(totalSeconds) { if (totalSeconds === null || totalSeconds < 0 || isNaN(totalSeconds)) { return "--:--"; } const minutes = Math.floor(totalSeconds / 60); const seconds = Math.floor(totalSeconds % 60); const paddedMinutes = String(minutes).padStart(2, '0'); const paddedSeconds = String(seconds).padStart(2, '0'); return `${paddedMinutes}:${paddedSeconds}`; }

/** Calculates statistics for a single game from its detailed data object. */
export function calculateGameStats(matchDetail) {
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
    let maxSetFromLineups = 0;

    match.lineups.forEach(p => { 
        const playerIdStr = String(p.player_id); 
        if (playerIdStr && p.team_id && p.player_name && p.shirt_number !== undefined) { 
            gameStats.playerStats[playerIdStr] = { name: p.player_name, shirt: p.shirt_number, team: p.team_id === gameStats.teamAInfo.id ? 'A' : 'B', points: 0, serves: 0, isCaptain: p.captain === 'C', setsPlayedFully: 0 }; 
            playerSetParticipation[playerIdStr] = { started: new Set(), subbedIn: new Set(), subbedOut: new Set(), playedInSet: new Set() }; 
            if (p.playing_position) { 
                for (const setNumStr in p.playing_position) { 
                    const setNum = parseInt(setNumStr, 10); 
                    if (!isNaN(setNum) && p.playing_position[setNum] >= 1 && p.playing_position[setNum] <= 6) { 
                        playerSetParticipation[playerIdStr].started.add(setNum);
                        playerSetParticipation[playerIdStr].playedInSet.add(setNum); // If started, played in set
                        if (setNum > maxSetFromLineups) maxSetFromLineups = setNum;
                    } 
                } 
            } 
        } else { 
            console.warn(`Skipping invalid lineup entry in match ${gameStats.matchId}:`, p); 
            if (!playerIdStr) lineupIsValid = false; 
        } 
    });
    if (!lineupIsValid) { console.error(`Calculation failed for match ${gameStats.matchId}: Invalid lineup entries found.`); return null; }

    substitutionLog.forEach(sub => { 
        const period = parseInt(sub.period, 10); 
        if (!isNaN(period) && period > 0) { 
            const playerInId = String(sub.player_id); 
            const playerOutId = String(sub.player_2_id); 
            if (playerInId && playerSetParticipation[playerInId]) { 
                playerSetParticipation[playerInId].subbedIn.add(period);
                playerSetParticipation[playerInId].playedInSet.add(period); // If subbed in, played in set
            } 
            if (playerOutId && playerSetParticipation[playerOutId]) { 
                playerSetParticipation[playerOutId].subbedOut.add(period); 
                // Do not remove from playedInSet, as they did participate
            } 
        } 
    });

    const maxSetFromEvents = Math.max(0, ...match.events.map(e => parseInt(e.period, 10)).filter(p => !isNaN(p) && p > 0));
    const maxSetPlayed = Math.max(1, maxSetFromLineups, maxSetFromEvents);

    for (const playerId in playerSetParticipation) { 
        let setsParticipatedCount = 0;
        for (let setNum = 1; setNum <= maxSetPlayed; setNum++) {
            const participation = playerSetParticipation[playerId];
            // Considered "played fully" if they were marked as starting and not subbed out in that set,
            // OR if they were subbed in and not subsequently subbed out in that set.
            // For C25, if no events, rely on lineup data.
            if (participation.playedInSet.has(setNum)) {
                 // If a player started a set, and was not subbed out of THAT set, they played it.
                if (participation.started.has(setNum) && !participation.subbedOut.has(setNum)) {
                    setsParticipatedCount++;
                } 
                // If a player was subbed into a set, and not subbed out of THAT set again, they played it.
                // This handles cases where a sub plays the remainder of a set.
                // Need to ensure this doesn't double count if they started and were subbed out then subbed back in.
                // The simple `playedInSet.has(setNum)` is a more general "participated" flag.
                // The test "setsPlayedFully" might be interpreted as "was on court when set ended or started and not subbed out".
                // Let's use a simpler definition based on `playedInSet` for now and see test results.
                // If events are empty, maxSetFromEvents will be 0.
                // If a player is listed in lineup for sets 1,2,3,4 (P1 in tests), and events are empty, they should get 4.
                else if (participation.subbedIn.has(setNum) && !participation.subbedOut.has(setNum)) {
                     // This condition is tricky; if they started, got subbed out, then subbed back in,
                     // the first condition would fail. The second would pass if they finish the set.
                     // For now, let's simplify: if they participated (started or subbed in), and were not subbed out of that specific set.
                     // The key is, if subbedOut.has(setNum) is true, they didn't "fully" play it in one continuous segment.
                     // The test C9/C12 (P2/P3) expects 0 if subbed out.
                     // P1 (C6) expects 4 (started all, never subbed out).
                     // P2 started 1&2, subbed out in S2 by P3. P3 subbed in S2, started S3&4, subbed out S3 by P2.
                     // P2: Started S1 (played), Started S2 (subbed out S2). Subbed In S3 (played). -> Expected 0? Actual 1.
                     // The current test logic seems to expect 0 if a player was ever subbed out of a set they started.
                }
            }
        }
         // Simpler: count sets in playedInSet, then subtract if subbed out of that set.
        // No, this is complex. Let's stick to the definition from problem: "sets a player is listed in the lineup for and plays from start to end without being substituted out"
        // This matches the original logic more closely: participation.started.has(setNum) && !participation.subbedOut.has(setNum)
        // The issue might be how subbedOut is populated or used.
        // Let's use the provided definition: "sets a player is listed in the lineup for and plays from start to end without being substituted out"
        // This means `playerSetParticipation[playerId].started.add(setNum)` is the base.
        // And `!playerSetParticipation[playerId].subbedOut.has(setNum)` is the condition.
        // This was the original logic. Why did it fail C9, C12?
        // P2: started {1,2}, subbedIn {}, subbedOut {2}. SetsPlayedFully = 1 (Set 1). Test C9 expects 0.
        // P3: started {3,4}, subbedIn {2}, subbedOut {3}. SetsPlayedFully = 1 (Set 4). Test C12 expects 0.
        // This implies if they are subbed *at all* in a set they started, it's not "fully played".
        // The original logic seems to align with "started and not subbed out".
        // What if `maxSetPlayed` is the issue for C25?
        // If events are empty, maxSetFromEvents = 0. maxSetFromLineups for P1 is 4. So maxSetPlayed = 4.
        // Loop 1 to 4. P1.started has 1,2,3,4. P1.subbedOut is empty. P1.subbedIn is empty. So count = 4. This matches C25 expectation.
        // So the original logic for setsPlayedFully seems correct based on definition and C25.
        // Failures C9, C12 (P2, P3) are then the ones to look at.
        // P2: Started sets 1, 2. Subbed out in set 2.
        // P1.playerStats["P2"].setsPlayedFully should be 1 (for set 1). Test C9 expects 0. This is a test expectation mismatch.
        // P3: Started sets 3, 4. Subbed out in set 3. (Subbed in for P2 in set 2).
        // P1.playerStats["P3"].setsPlayedFully should be 1 (for set 4). Test C12 expects 0. Test expectation mismatch.
        // Given the definition: "sets a player is listed in the lineup for and plays from start to end without being substituted out."
        // The current code for setsPlayedFully IS correct according to this definition.
        // The tests C9 and C12 seem to be interpreting "setsPlayedFully" differently, perhaps as "sets where the player was never substituted".
        // I will proceed assuming my code's interpretation of "setsPlayedFully" is correct as per the definition.
        // The serve count is more likely a bug.

        for (let setNum = 1; setNum <= maxSetPlayed; setNum++) {
            const participation = playerSetParticipation[playerId];
            if (participation.started.has(setNum) && !participation.subbedOut.has(setNum)) {
                 if (gameStats.playerStats[playerId]) gameStats.playerStats[playerId].setsPlayedFully++;
            }
        }
    }


    (match.events || []).forEach(event => { if (event.code === 'aikalisa') { if (event.team_id === gameStats.teamAInfo.id) gameStats.teamAInfo.timeouts++; else if (event.team_id === gameStats.teamBInfo.id) gameStats.teamBInfo.timeouts++; } });
    // substitutionLog for subs count already includes filtered events if substitution_events is missing
    gameStats.teamAInfo.subs = 0; gameStats.teamBInfo.subs = 0; // Reset before counting
    substitutionLog.forEach(sub => { if (sub.team_id === gameStats.teamAInfo.id) gameStats.teamAInfo.subs++; else if (sub.team_id === gameStats.teamBInfo.id) gameStats.teamBInfo.subs++; });
    let currentSet = 0; let teamAPoints = 0; let teamBPoints = 0; let servingTeam = null; let lastServingTeam = null; let playerPositionsA = {}; let playerPositionsB = {};
    const setGameStartingLineup = (setNum) => { playerPositionsA = {}; playerPositionsB = {}; match.lineups.forEach(p => { const pid = String(p.player_id); if (p.playing_position?.[setNum]) { const zone = p.playing_position[setNum]; if (zone >= 1 && zone <= 6) { if (p.team_id === gameStats.teamAInfo.id) playerPositionsA[zone] = pid; else playerPositionsB[zone] = pid; } } }); };
    const rotateGameTeam = (teamIdSymbol) => { const currentPositions = teamIdSymbol === 'A' ? playerPositionsA : playerPositionsB; const newPositions = {}; newPositions[1] = currentPositions[2]; newPositions[6] = currentPositions[1]; newPositions[5] = currentPositions[6]; newPositions[4] = currentPositions[5]; newPositions[3] = currentPositions[4]; newPositions[2] = currentPositions[3]; for (let zone = 1; zone <= 6; zone++) { if (teamIdSymbol === 'A') playerPositionsA[zone] = newPositions[zone] || null; else playerPositionsB[zone] = newPositions[zone] || null; } };
    const sortedGameEvents = [...match.events].sort((a, b) => { if (!a.wall_time || !b.wall_time) return 0; if (a.wall_time < b.wall_time) return -1; if (a.wall_time > b.wall_time) return 1; return 0; });
    let eventProcessingError = false;
    for (const event of sortedGameEvents) { try { let needsRotation = null; let pointScoredBy = null; let scorerPlayerId = null; if (event.period && parseInt(event.period) > 0 && parseInt(event.period) !== currentSet) { if (event.code !== 'maali') { currentSet = parseInt(event.period); teamAPoints = 0; teamBPoints = 0; setGameStartingLineup(currentSet); } }
        switch (event.code) { 
            case 'aloitajakso': 
                currentSet = parseInt(event.period); teamAPoints = 0; teamBPoints = 0; 
                setGameStartingLineup(currentSet); 
                servingTeam = null; lastServingTeam = null; 
                break; 
            case 'aloittavajoukkue': 
                servingTeam = event.team_id === gameStats.teamAInfo.id ? 'A' : 'B'; 
                lastServingTeam = servingTeam; 
                const serverIdStart = servingTeam === 'A' ? playerPositionsA[1] : playerPositionsB[1]; 
                if (serverIdStart && gameStats.playerStats[serverIdStart]) { 
                    gameStats.playerStats[serverIdStart].serves++; 
                } 
                break; 
            case 'piste': 
                const scoreMatch = event.description?.match(/(\d+)-(\d+)/); 
                if (scoreMatch) { 
                    const currentPtsA = teamAPoints; 
                    const currentPtsB = teamBPoints; 
                    const newPtsA = parseInt(scoreMatch[1]); 
                    const newPtsB = parseInt(scoreMatch[2]); 
                    pointScoredBy = (newPtsA > currentPtsA) ? 'A' : 'B'; 
                    teamAPoints = newPtsA; teamBPoints = newPtsB; 
                    
                    if (event.player_id && String(event.player_id) !== '1') { 
                        scorerPlayerId = String(event.player_id); 
                        if(gameStats.playerStats[scorerPlayerId]) { 
                            gameStats.playerStats[scorerPlayerId].points++; 
                        } else { 
                            console.warn(`Scorer ID ${scorerPlayerId} from event not in lineup for match ${gameStats.matchId}`); 
                            // If scorer not in lineup, treat as an implied error by the opponent of the team that got the point.
                            if (pointScoredBy === 'A') { // Team A scored, so Team B made an error
                                gameStats.teamBInfo.impliedOpponentErrors++;
                            } else { // Team B scored, so Team A made an error
                                gameStats.teamAInfo.impliedOpponentErrors++;
                            }
                        } 
                    } else {  // player_id is '1' or missing
                        if (pointScoredBy === 'A') { // Team A scored, so Team B made an error
                            gameStats.teamBInfo.impliedOpponentErrors++; 
                        } else { // Team B scored, so Team A made an error
                            gameStats.teamAInfo.impliedOpponentErrors++; 
                        } 
                    } 
                    
                    if (servingTeam && pointScoredBy !== servingTeam) { // Opponent scored, service changes
                        needsRotation = pointScoredBy; 
                        servingTeam = pointScoredBy; // New serving team
                        // Server after rotation gets a serve point
                        const serverIdRotated = servingTeam === 'A' ? playerPositionsA[1] : playerPositionsB[1]; // This is post-rotation player
                        // The rotation itself should happen *before* assigning the serve to new P1
                    } else if (servingTeam && pointScoredBy === servingTeam) { // Serving team scored
                        // Player in P1 of serving team gets another serve credit
                        const serverIdHold = servingTeam === 'A' ? playerPositionsA[1] : playerPositionsB[1];
                        if (serverIdHold && gameStats.playerStats[serverIdHold]) {
                            gameStats.playerStats[serverIdHold].serves++;
                        }
                    } else if (!servingTeam) { // First point of a set, and servingTeam was not set by 'aloittavajoukkue' (should not happen if data is good)
                        servingTeam = pointScoredBy; // The team who scored serves next
                        // This implies it's their first serve of the rally potentially.
                        const firstServer = servingTeam === 'A' ? playerPositionsA[1] : playerPositionsB[1];
                        if (firstServer && gameStats.playerStats[firstServer]) {
                             // This might double count if aloittavajoukkue was already processed.
                             // Let's assume aloittavajoukkue handles the very first serve.
                             // This block is for subsequent serves.
                        }
                    }
                    lastServingTeam = servingTeam; // Update who is now serving for the next point.
                } else { 
                    console.warn(`Could not parse score from piste event description: ${event.description}`); 
                } 
                break; 
            case 'maali': servingTeam = null; lastServingTeam = null; break; 
            case 'lopetaottelu': servingTeam = null; lastServingTeam = null; break; 
        }
        if (needsRotation) { 
            rotateGameTeam(needsRotation); 
            const serverIdRotated = needsRotation === 'A' ? playerPositionsA[1] : playerPositionsB[1]; 
            if (serverIdRotated && gameStats.playerStats[serverIdRotated]) { 
                gameStats.playerStats[serverIdRotated].serves++; 
            } 
        } } catch (innerError) { console.error(`Error processing event ${event.event_id} in match ${gameStats.matchId}:`, innerError); eventProcessingError = true; } }
    if (eventProcessingError) { console.warn(`Stats for match ${gameStats.matchId} may be incomplete due to event processing errors.`); }
    gameStats.teamAInfo.impliedErrorsMade = gameStats.teamBInfo.impliedOpponentErrors; gameStats.teamBInfo.impliedErrorsMade = gameStats.teamAInfo.impliedOpponentErrors;
    console.log(`Finished calculating stats for match ID: ${match.match_id}`);
    console.log(`Returning gameStats for match ${match.match_id}:`, JSON.parse(JSON.stringify(gameStats))); // Log final calculated object
    return gameStats;
}

// Ensure these are declared if not already, for clarity, though they are global.
// These will be accessed by the test script.
let teamIdOfInterest; 
let aggregateStats = { players: {}, team: { timeouts: 0, subs: 0, impliedOpponentErrors: 0, impliedErrorsMade: 0, gamesProcessed: 0 } };

// --- Aggregate Stats Function ---
/** Adds stats from a single game to the aggregate totals object. */
export function aggregateGameStats(gameStats) { 
    // Use the global teamIdOfInterest and aggregateStats from the module,
    // which can be set by the test script via the exported setters.
    const currentTeamId = global.teamIdOfInterestUser ? global.teamIdOfInterestUser() : teamIdOfInterest;
    let currentAggregateStats = global.aggregateStatsUser ? global.aggregateStatsUser() : aggregateStats;

    if (!gameStats || !currentTeamId) return; 
    if (!currentAggregateStats.players) { 
        currentAggregateStats = { players: {}, team: { timeouts: 0, subs: 0, impliedOpponentErrors: 0, impliedErrorsMade: 0, gamesProcessed: 0 } }; 
    } 
    
    let teamOfInterestSymbol = null; 
    if (String(gameStats.teamAInfo.id) === String(currentTeamId)) teamOfInterestSymbol = 'A'; 
    else if (String(gameStats.teamBInfo.id) === String(currentTeamId)) teamOfInterestSymbol = 'B'; 
    else return; 
    
    const teamData = gameStats[`team${teamOfInterestSymbol}Info`]; 
    currentAggregateStats.team.timeouts += teamData.timeouts; 
    currentAggregateStats.team.subs += teamData.subs; 
    currentAggregateStats.team.impliedOpponentErrors += teamData.impliedOpponentErrors; 
    currentAggregateStats.team.impliedErrorsMade += teamData.impliedErrorsMade; 
    currentAggregateStats.team.gamesProcessed++; 
    
    for (const playerId in gameStats.playerStats) { 
        const pStats = gameStats.playerStats[playerId]; 
        if (pStats.team === teamOfInterestSymbol) { 
            if (!currentAggregateStats.players[playerId]) { 
                currentAggregateStats.players[playerId] = { name: pStats.name, shirt: pStats.shirt, points: 0, serves: 0, gamesPlayed: 0, setsPlayedFully: 0, isCaptain: pStats.isCaptain }; 
            } else if (pStats.isCaptain) { 
                currentAggregateStats.players[playerId].isCaptain = true; 
            } 
            currentAggregateStats.players[playerId].points += pStats.points; 
            currentAggregateStats.players[playerId].serves += pStats.serves; 
            currentAggregateStats.players[playerId].setsPlayedFully += pStats.setsPlayedFully; 
            currentAggregateStats.players[playerId].gamesPlayed++; 
        } 
    }
    // If aggregateStats was managed by global setters in the test, update it.
    if (global.setAggregateStatsUser) {
        global.setAggregateStatsUser(currentAggregateStats);
    } else {
        aggregateStats = currentAggregateStats; // Fallback for non-test environment
    }
}
