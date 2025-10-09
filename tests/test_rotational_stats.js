import { calculateRotationalStats } from '../js/stats_calculator.js';

function assertEqual(actual, expected, name) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`PASSED: ${name}`);
    } else {
        console.error(`FAILED: ${name}`);
        console.error(`  Expected: ${JSON.stringify(expected)}`);
        console.error(`  Actual:   ${JSON.stringify(actual)}`);
        process.exitCode = 1;
    }
}

const mockGameData = {
    match: {
        team_A_id: 'A',
        team_B_id: 'B',
        lineups: [
            { player_id: 'A1', team_id: 'A', player_name: 'Alice', shirt_number: '1', playing_position: { 1: 1 } },
            { player_id: 'A2', team_id: 'A', player_name: 'Alan', shirt_number: '2', playing_position: { 1: 2 } },
            { player_id: 'A3', team_id: 'A', player_name: 'Anna', shirt_number: '3', playing_position: { 1: 3 } },
            { player_id: 'A4', team_id: 'A', player_name: 'Aaron', shirt_number: '4', playing_position: { 1: 4 } },
            { player_id: 'A5', team_id: 'A', player_name: 'Amy', shirt_number: '5', playing_position: { 1: 5 } },
            { player_id: 'A6', team_id: 'A', player_name: 'Andy', shirt_number: '6', playing_position: { 1: 6 } },
            { player_id: 'B1', team_id: 'B', player_name: 'Bob', shirt_number: '11', playing_position: { 1: 1 } },
            { player_id: 'B2', team_id: 'B', player_name: 'Bill', shirt_number: '12', playing_position: { 1: 2 } },
            { player_id: 'B3', team_id: 'B', player_name: 'Barb', shirt_number: '13', playing_position: { 1: 3 } },
            { player_id: 'B4', team_id: 'B', player_name: 'Ben', shirt_number: '14', playing_position: { 1: 4 } },
            { player_id: 'B5', team_id: 'B', player_name: 'Beth', shirt_number: '15', playing_position: { 1: 5 } },
            { player_id: 'B6', team_id: 'B', player_name: 'Buzz', shirt_number: '16', playing_position: { 1: 6 } },
        ],
        events: [
            // Set 1
            { event_id: 'e1', code: 'aloitajakso', period: '1', wall_time: '10:00:00' },
            { event_id: 'e2', code: 'aloittavajoukkue', period: '1', team_id: 'A', wall_time: '10:00:01' }, // A serves, A1 in P1
            { event_id: 'p1', code: 'piste', period: '1', description: '1-0', team_id: 'A', wall_time: '10:00:10' }, // A scores. A1 rotation: +1
            { event_id: 'p2', code: 'piste', period: '1', description: '2-0', team_id: 'A', wall_time: '10:00:20' }, // A scores. A1 rotation: +2
            { event_id: 'p3', code: 'piste', period: '1', description: '2-1', team_id: 'B', wall_time: '10:00:30' }, // B scores. A1 rotation: +1. Sideout. B rotates. B2 is now P1.
            { event_id: 'p4', code: 'piste', period: '1', description: '2-2', team_id: 'B', wall_time: '10:00:40' }, // B scores. B2 rotation: +1
            { event_id: 'p5', code: 'piste', period: '1', description: '3-2', team_id: 'A', wall_time: '10:00:50' }, // A scores. B2 rotation: 0. Sideout. A rotates. A2 is now P1.
            { event_id: 'p6', code: 'piste', period: '1', description: '3-3', team_id: 'B', wall_time: '10:01:00' }, // B scores. A2 rotation: -1. Sideout. B rotates. B3 is now P1.
        ],
        substitution_events: []
    }
};

const stats = calculateRotationalStats(mockGameData.match.events, mockGameData, 'A', 'B');

// --- Asserts for Team A ---
const teamAStats = stats.teamA;
// Rotation A1 is active for p1, p2, p3, p4, p5. Scores: A, A, B, B, A. For: 3, Against: 2.
assertEqual(teamAStats['A1']?.pointsFor, 3, "Team A, Rotation A1 Points For");
assertEqual(teamAStats['A1']?.pointsAgainst, 2, "Team A, Rotation A1 Points Against");
// Rotation A2 is active for p6. Score: B. For: 0, Against: 1.
assertEqual(teamAStats['A2']?.pointsFor, 0, "Team A, Rotation A2 Points For");
assertEqual(teamAStats['A2']?.pointsAgainst, 1, "Team A, Rotation A2 Points Against");


// --- Asserts for Team B ---
const teamBStats = stats.teamB;
// Rotation B1 is active for p1, p2, p3. Scores: A, A, B. For: 1, Against: 2.
assertEqual(teamBStats['B1']?.pointsFor, 1, "Team B, Rotation B1 Points For");
assertEqual(teamBStats['B1']?.pointsAgainst, 2, "Team B, Rotation B1 Points Against");
// Rotation B2 is active for p4, p5, p6. Scores: B, A, B. For: 2, Against: 1.
assertEqual(teamBStats['B2']?.pointsFor, 2, "Team B, Rotation B2 Points For");
assertEqual(teamBStats['B2']?.pointsAgainst, 1, "Team B, Rotation B2 Points Against");
// Rotation B3 is active after p6, but there are no more points. It should not exist in the stats.
assertEqual(teamBStats['B3'], undefined, "Team B, Rotation B3 should be undefined");


console.log("Rotational stats tests complete.");