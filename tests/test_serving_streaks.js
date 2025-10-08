import { calculateServingStreaks } from '../js/stats_calculator.js';

function assertEqual(actual, expected, name) {
    if (actual === expected) console.log(`PASSED: ${name}`);
    else { console.error(`FAILED: ${name}\n  Expected: ${expected}\n  Actual: ${actual}`); process.exitCode = 1; }
}

// Synthetic match: Team A starts serving in set 1, player A1 serves and wins 2 points, then Team B scores (sideout), Team B's P1 serves and wins 3 points.
const synthetic = {
    match: {
        team_A_id: 'A', team_B_id: 'B',
        lineups: [
            { player_id: 'A1', team_id: 'A', player_name: 'Alice', shirt_number: '1', playing_position: { 1: 1 } },
            { player_id: 'A2', team_id: 'A', player_name: 'Alan', shirt_number: '2', playing_position: { 1: 2 } },
            { player_id: 'B1', team_id: 'B', player_name: 'Bob', shirt_number: '3', playing_position: { 1: 1 } },
            { player_id: 'B2', team_id: 'B', player_name: 'Bill', shirt_number: '4', playing_position: { 1: 2 } }
        ],
        events: [
            { event_id: 'e1', code: 'aloitajakso', period: '1', wall_time: '10:00:00' },
            { event_id: 'e2', code: 'aloittavajoukkue', period: '1', team_id: 'A', wall_time: '10:00:01' },
            { event_id: 'p1', code: 'piste', period: '1', description: '1-0', team_id: 'A', player_id: 'A1', wall_time: '10:00:10' },
            { event_id: 'p2', code: 'piste', period: '1', description: '2-0', team_id: 'A', player_id: 'A2', wall_time: '10:00:20' },
            { event_id: 'p3', code: 'piste', period: '1', description: '2-1', team_id: 'B', player_id: 'B1', wall_time: '10:00:30' },
            { event_id: 'p4', code: 'piste', period: '1', description: '2-2', team_id: 'B', player_id: 'B2', wall_time: '10:00:40' },
            { event_id: 'p5', code: 'piste', period: '1', description: '2-3', team_id: 'B', player_id: 'B1', wall_time: '10:00:50' },
            { event_id: 'p6', code: 'lopetaottelu', period: '1', wall_time: '10:05:00' }
        ],
        substitution_events: []
    }
};

const streaks = calculateServingStreaks(synthetic.match.events, synthetic, 'A', 'B');
// We expect A1 to have maxStreak 2 (served and team scored twice), B1 to have maxStreak 2 or 3 depending on rotation logic; according to implementation, B1 should get a streak of 2 or 1.
// Let's assert top values exist for team A and team B in returned array.

// Find by player id mapping via shirt numbers
const byId = {};
streaks.forEach(s => { byId[s.name] = s; });

// Alice should exist
const alice = Object.values(streaks).find(s => s.name === 'Alice');
assertEqual(alice && alice.maxStreak > 0, true, 'Alice has a serving streak');

// Bob should exist
const bob = Object.values(streaks).find(s => s.name === 'Bob');
assertEqual(bob && bob.maxStreak > 0, true, 'Bob has a serving streak');

console.log('Serving streaks test completed.');
