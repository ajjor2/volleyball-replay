export function extractStartingPositionsPerSet(lineups) {
    // lineups: array of player objects with playing_position mapping
    if (!Array.isArray(lineups)) return {};
    const sets = {};
    lineups.forEach(p => {
        const pid = String(p.player_id);
        if (!p.playing_position || typeof p.playing_position !== 'object') return;
        Object.keys(p.playing_position).forEach(setKey => {
            const setNum = parseInt(setKey, 10);
            if (isNaN(setNum)) return;
            const pos = p.playing_position[setKey];
            if (pos === null || pos === undefined) return;
            if (!sets[setNum]) sets[setNum] = { A: {}, B: {} };
            const team = p.team_id; // caller can map team ids to A/B
            // We'll store by team id at this utility level; caller can separate by team
            if (!sets[setNum][team]) sets[setNum][team] = {};
            sets[setNum][team][pos] = { player_id: pid, name: p.player_name, shirt: p.shirt_number };
        });
    });
    return sets; // { setNum: { <teamId>: { pos: { player } } } }
}
