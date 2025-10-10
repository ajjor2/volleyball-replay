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

// Expect exact streaks produced by the simulation:
// - Alice (A1) serves first and team scores twice -> streak 2 in set 1
// - After sideout, rotation makes B2 (Bill) serve; B scores 3 consecutive points (2-3) -> streak 3 in set 1

function findByName(arr, name) { return arr.find(x => x.name === name); }

const alice = findByName(streaks, 'Alice');
assertEqual(Boolean(alice), true, 'Alice streak entry exists');
assertEqual(alice && alice.streak, 2, 'Alice streak equals 2');
assertEqual(alice && alice.setNum, 1, 'Alice streak set is 1');

const bill = findByName(streaks, 'Bill');
assertEqual(Boolean(bill), true, 'Bill streak entry exists');
assertEqual(bill && bill.streak, 3, 'Bill streak equals 3');
assertEqual(bill && bill.setNum, 1, 'Bill streak set is 1');

// Verify that courtState was captured for the streaks
assertEqual(alice && typeof alice.courtState, 'object', 'Alice streak has courtState object');
assertEqual(bill && typeof bill.courtState, 'object', 'Bill streak has courtState object');
assertEqual(alice && alice.courtState && typeof alice.courtState.a, 'object', 'Alice courtState has team A positions');
assertEqual(bill && bill.courtState && typeof bill.courtState.b, 'object', 'Bill courtState has team B positions');


console.log('Serving streaks test (exact values) completed.');
