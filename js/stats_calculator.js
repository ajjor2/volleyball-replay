// js/stats_calculator.js

/**
 * Calculates statistics for a single match for a specified team.
 * @param {object} matchData - The detailed match data from the API.
 * @param {string} teamId - The ID of the team to calculate stats for.
 * @returns {object} - An object containing calculated statistics.
 */
function calculateMatchStats(matchData, teamId) {
    const stats = {
        playerPoints: {},
        playerServes: {},
        impliedErrorsMade: 0,
        opponentImpliedErrors: 0,
    };

    if (!matchData || !matchData.events) {
        return stats;
    }

    const teamPlayers = new Set();
    if (matchData.team_A_id === teamId) {
        matchData.team_A_players.forEach(p => teamPlayers.add(p.id));
    } else {
        matchData.team_B_players.forEach(p => teamPlayers.add(p.id));
    }

    matchData.events.forEach(event => {
        if (event.type === 'Piste') {
            const pointWinnerId = event.piste_joukkue_id;
            const scoringPlayerId = event.pelaaja_id;

            if (pointWinnerId === teamId) {
                // Our team scored
                if (scoringPlayerId && teamPlayers.has(scoringPlayerId)) {
                    stats.playerPoints[scoringPlayerId] = (stats.playerPoints[scoringPlayerId] || 0) + 1;
                } else {
                    stats.opponentImpliedErrors++;
                }
            } else {
                // Opponent scored
                if (!scoringPlayerId) {
                    stats.impliedErrorsMade++;
                }
            }
        }

        if (event.type === 'Syöttö' && teamPlayers.has(event.pelaaja_id)) {
            const servingPlayerId = event.pelaaja_id;
            stats.playerServes[servingPlayerId] = (stats.playerServes[servingPlayerId] || 0) + 1;
        }
    });

    return stats;
}
