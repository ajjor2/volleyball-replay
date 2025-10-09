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

    // Track current player positions on court for both teams. Initialize before processing substitutions/events.
    let playerPositionsA = {};
    let playerPositionsB = {};

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
            // Update player positions if sub happens mid-set
            // This is a simplified model assuming the sub takes the exact position.
            if (sub.team_id === gameStats.teamAInfo.id) {
                for (const pos in playerPositionsA) {
                    if (playerPositionsA[pos] === playerOutId) playerPositionsA[pos] = playerInId;
                }
            } else if (sub.team_id === gameStats.teamBInfo.id) {
                for (const pos in playerPositionsB) {
                    if (playerPositionsB[pos] === playerOutId) playerPositionsB[pos] = playerInId;
                }
            }
        } 
    });

    const maxSetFromEvents = Math.max(0, ...match.events.map(e => parseInt(e.period, 10)).filter(p => !isNaN(p) && p > 0));
    const maxSetPlayed = Math.max(1, maxSetFromLineups, maxSetFromEvents);

    for (const playerId in playerSetParticipation) { 
        for (let setNum = 1; setNum <= maxSetPlayed; setNum++) {
            const participation = playerSetParticipation[playerId];
            // Definition: "sets a player is listed in the lineup for and plays from start to end without being substituted out."
            // This means they must start the set and not be subbed out of that set.
            if (participation.started.has(setNum) && !participation.subbedOut.has(setNum)) {
                 if (gameStats.playerStats[playerId]) gameStats.playerStats[playerId].setsPlayedFully++;
            }
        }
    }


    (match.events || []).forEach(event => { if (event.code === 'aikalisa') { if (event.team_id === gameStats.teamAInfo.id) gameStats.teamAInfo.timeouts++; else if (event.team_id === gameStats.teamBInfo.id) gameStats.teamBInfo.timeouts++; } });
    // substitutionLog for subs count already includes filtered events if substitution_events is missing
    gameStats.teamAInfo.subs = 0; gameStats.teamBInfo.subs = 0; // Reset before counting
    substitutionLog.forEach(sub => { if (sub.team_id === gameStats.teamAInfo.id) gameStats.teamAInfo.subs++; else if (sub.team_id === gameStats.teamBInfo.id) gameStats.teamBInfo.subs++; });
    let currentSet = 0; let teamAPoints = 0; let teamBPoints = 0; let servingTeam = null; let lastServingTeam = null;
    const setGameStartingLineup = (setNum) => { playerPositionsA = {}; playerPositionsB = {}; match.lineups.forEach(p => { const pid = String(p.player_id); if (p.playing_position?.[setNum]) { const zone = p.playing_position[setNum]; if (zone >= 1 && zone <= 6) { if (p.team_id === gameStats.teamAInfo.id) playerPositionsA[zone] = pid; else playerPositionsB[zone] = pid; } } }); };
    const rotateGameTeam = (teamIdSymbol) => { const currentPositions = teamIdSymbol === 'A' ? playerPositionsA : playerPositionsB; const newPositions = {}; newPositions[1] = currentPositions[2]; newPositions[6] = currentPositions[1]; newPositions[5] = currentPositions[6]; newPositions[4] = currentPositions[5]; newPositions[3] = currentPositions[4]; newPositions[2] = currentPositions[3]; for (let zone = 1; zone <= 6; zone++) { if (teamIdSymbol === 'A') playerPositionsA[zone] = newPositions[zone] || null; else playerPositionsB[zone] = newPositions[zone] || null; } };
    const sortedGameEvents = [...match.events].sort((a, b) => { if (!a.wall_time || !b.wall_time) return 0; if (a.wall_time < b.wall_time) return -1; if (a.wall_time > b.wall_time) return 1; return 0; });
    let eventProcessingError = false;
    for (const event of sortedGameEvents) { try { 
        // Handle substitutions first to update player positions before point/serve logic
        if (event.code === 'vaihto' && (!match.substitution_events || match.substitution_events.length === 0)) {
            const playerInId = String(event.player_id);
            const playerOutId = String(event.player_2_id);
            if (event.team_id === gameStats.teamAInfo.id) {
                for (const pos in playerPositionsA) { if (playerPositionsA[pos] === playerOutId) playerPositionsA[pos] = playerInId; }
            } else if (event.team_id === gameStats.teamBInfo.id) {
                for (const pos in playerPositionsB) { if (playerPositionsB[pos] === playerOutId) playerPositionsB[pos] = playerInId; }
            }
        }

        let needsRotation = null; let pointScoredBy = null; let scorerPlayerId = null; if (event.period && parseInt(event.period) > 0 && parseInt(event.period) !== currentSet) { if (event.code !== 'maali') { currentSet = parseInt(event.period); teamAPoints = 0; teamBPoints = 0; setGameStartingLineup(currentSet); } }
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

/**
 * Calculate longest serving streaks per player given game events and lineup data.
 * Returns array of { name, shirt, teamSymbol, maxStreak } sorted by descending maxStreak.
 */
export function calculateServingStreaks(gameSortedEvents, lineupData, teamAId_param, teamBId_param) {
    // New behavior: return all serving streaks of length >= 2.
    // Each entry: { playerId, name, shirt, teamSymbol, setNum, streak, courtState }
    if (!lineupData || !lineupData.match || !Array.isArray(lineupData.match.lineups) || !Array.isArray(gameSortedEvents)) return [];

    // Map playerId -> meta info
    const playerInfo = {};
    lineupData.match.lineups.forEach(p => {
        const pid = String(p.player_id);
        playerInfo[pid] = { name: p.player_name || '', shirt: p.shirt_number || '', teamSymbol: p.team_id === teamAId_param ? 'A' : 'B', rawTeamId: p.team_id };
    });

    // Helper to find player meta if initial map didn't include it (handles id type mismatches)
    const getPlayerMeta = (pid) => {
        const spid = String(pid);
        if (playerInfo[spid]) return playerInfo[spid];
        const found = lineupData.match.lineups.find(p => String(p.player_id) === spid || p.player_id === pid || String(p.player_id) === String(Number(spid)));
        if (found) {
            const meta = { name: found.player_name || '', shirt: found.shirt_number || '', teamSymbol: found.team_id === teamAId_param ? 'A' : 'B', rawTeamId: found.team_id };
            playerInfo[spid] = meta; // cache
            return meta;
        }
        return { name: '', shirt: '', teamSymbol: '', rawTeamId: null };
    };

    let positionsA = {};
    let positionsB = {};

    const setStartingLineup = (setNum) => {
        positionsA = {}; positionsB = {};
        lineupData.match.lineups.forEach(p => {
            const pid = String(p.player_id);
            if (p.playing_position && p.playing_position[setNum]) {
                const zone = p.playing_position[setNum];
                if (zone >= 1 && zone <= 6) {
                    if (p.team_id === teamAId_param) positionsA[zone] = pid;
                    else if (p.team_id === teamBId_param) positionsB[zone] = pid;
                }
            }
        });
    };

    const rotateTeamPositions = (teamSymbol) => {
        const current = teamSymbol === 'A' ? positionsA : positionsB;
        const next = {};
        next[1] = current[2]; next[6] = current[1]; next[5] = current[6]; next[4] = current[5]; next[3] = current[4]; next[2] = current[3];
        if (teamSymbol === 'A') positionsA = next; else positionsB = next;
    };

    const subs = Array.isArray(lineupData.match.substitution_events) && lineupData.match.substitution_events.length > 0
        ? lineupData.match.substitution_events
        : gameSortedEvents.filter(e => e.code === 'vaihto');

    const applySub = (sub) => {
        const playerInId = String(sub.player_id);
        const playerOutId = String(sub.player_2_id || sub.player_out_id || '');
        if (!playerInId) return;
        if (String(sub.team_id) === String(teamAId_param)) {
            for (const pos in positionsA) {
                if (positionsA[pos] === playerOutId) positionsA[pos] = playerInId;
            }
        } else if (String(sub.team_id) === String(teamBId_param)) {
            for (const pos in positionsB) {
                if (positionsB[pos] === playerOutId) positionsB[pos] = playerInId;
            }
        }
    };

    let currentServingTeamId = null;
    let currentServerPlayerId = null;
    let currentSetNum = null;
    let lastSeenPeriod = null;
    let currentServerStreak = 0;
    let streakStartCourtState = null; // Will hold the court state for the current server.

    const recordedStreaks = [];

    for (const event of gameSortedEvents) {
        if (event.code === 'aloitajakso' || (event.period && parseInt(event.period) > 0 && event.code !== 'maali' && currentSetNum === null)) {
            const s = parseInt(event.period, 10);
            if (!isNaN(s) && s > 0) {
                // Finalize streak from previous set before starting new one
                if (currentServerPlayerId && currentServerStreak >= 2) {
                    const meta = getPlayerMeta(currentServerPlayerId);
                    recordedStreaks.push({ playerId: currentServerPlayerId, name: meta.name, shirt: meta.shirt, teamSymbol: meta.teamSymbol, setNum: currentSetNum, streak: currentServerStreak, courtState: streakStartCourtState });
                }
                currentSetNum = s;
                setStartingLineup(s);
            }
            currentServingTeamId = null; currentServerPlayerId = null; currentServerStreak = 0; streakStartCourtState = null;
        }

        if (event && event.period) {
            const pp = parseInt(event.period, 10);
            if (!isNaN(pp) && pp > 0) lastSeenPeriod = pp;
        }

        if (subs && subs.length > 0) subs.filter(s => s.wall_time === event.wall_time && s.period === event.period).forEach(applySub);

        if (event.code === 'aloittavajoukkue') {
            currentServingTeamId = String(event.team_id);
            const teamPositions = currentServingTeamId === String(teamAId_param) ? positionsA : positionsB;
            currentServerPlayerId = teamPositions[1] || null;
            currentServerStreak = 0;
            streakStartCourtState = { a: { ...positionsA }, b: { ...positionsB } };
        } else if (event.code === 'piste') {
            const pointWinnerId = String(event.team_id);
            if (currentServerPlayerId && currentServingTeamId) {
                if (String(pointWinnerId) === String(currentServingTeamId)) {
                    currentServerStreak++;
                } else {
                    if (currentServerPlayerId && currentServerStreak >= 2) {
                        const meta = getPlayerMeta(currentServerPlayerId);
                        const setNumToRecord = currentSetNum || (event && event.period ? parseInt(event.period, 10) : lastSeenPeriod) || 1;
                        recordedStreaks.push({ playerId: currentServerPlayerId, name: meta.name, shirt: meta.shirt, teamSymbol: meta.teamSymbol, setNum: setNumToRecord, streak: currentServerStreak, courtState: streakStartCourtState });
                    }
                    const newServingTeamSymbol = String(pointWinnerId) === String(teamAId_param) ? 'A' : 'B';
                    rotateTeamPositions(newServingTeamSymbol);
                    currentServingTeamId = pointWinnerId;
                    const teamPositions = newServingTeamSymbol === 'A' ? positionsA : positionsB;
                    currentServerPlayerId = teamPositions[1] || null;
                    streakStartCourtState = { a: { ...positionsA }, b: { ...positionsB } };
                    currentServerStreak = currentServerPlayerId ? 1 : 0;
                }
            } else {
                currentServingTeamId = pointWinnerId;
                const teamPositions = String(pointWinnerId) === String(teamAId_param) ? positionsA : positionsB;
                currentServerPlayerId = teamPositions[1] || null;
                streakStartCourtState = { a: { ...positionsA }, b: { ...positionsB } };
                currentServerStreak = currentServerPlayerId ? 1 : 0;
            }
        } else if (event.code === 'lopetaottelu' || event.code === 'maali') {
            if (currentServerPlayerId && currentServerStreak >= 2) {
                const meta = getPlayerMeta(currentServerPlayerId);
                const setNumToRecord = currentSetNum || lastSeenPeriod || 1;
                recordedStreaks.push({ playerId: currentServerPlayerId, name: meta.name, shirt: meta.shirt, teamSymbol: meta.teamSymbol, setNum: setNumToRecord, streak: currentServerStreak, courtState: streakStartCourtState });
            }
            currentServerStreak = 0; currentServingTeamId = null; currentServerPlayerId = null; streakStartCourtState = null;
            if(event.code !== 'lopetaottelu') currentSetNum = null;
        }
    }

    if (currentServerPlayerId && currentServerStreak >= 2) {
        const meta = getPlayerMeta(currentServerPlayerId);
        recordedStreaks.push({ playerId: currentServerPlayerId, name: meta.name, shirt: meta.shirt, teamSymbol: meta.teamSymbol, setNum: currentSetNum, streak: currentServerStreak, courtState: streakStartCourtState });
    }

    return recordedStreaks.sort((a,b) => b.streak - a.streak || a.teamSymbol.localeCompare(b.teamSymbol));
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
