import { extractStartingPositionsPerSet } from '../js/lineup_utils.js';

function assertEqual(actual, expected, name) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) console.log(`PASSED: ${name}`);
    else { console.error(`FAILED: ${name}`); console.error('  expected:', JSON.stringify(expected)); console.error('  actual:  ', JSON.stringify(actual)); process.exitCode = 1; }
}

const mockLineups = [
    { player_id: 'P1', team_id: 'T1', player_name: 'Alice', shirt_number: '1', playing_position: { 1: 1, 2: 1 } },
    { player_id: 'P2', team_id: 'T1', player_name: 'Bob', shirt_number: '2', playing_position: { 1: 2 } },
    { player_id: 'P3', team_id: 'T2', player_name: 'Charlie', shirt_number: '3', playing_position: { 1: 1 } },
    { player_id: 'P4', team_id: 'T2', player_name: 'Dana', shirt_number: '4', playing_position: {} },
];

const expected = {
    '1': {
        'T1': { '1': { player_id: 'P1', name: 'Alice', shirt: '1' }, '2': { player_id: 'P2', name: 'Bob', shirt: '2' } },
        'T2': { '1': { player_id: 'P3', name: 'Charlie', shirt: '3' } }
    },
    '2': {
        'T1': { '1': { player_id: 'P1', name: 'Alice', shirt: '1' } }
    }
};

const result = extractStartingPositionsPerSet(mockLineups);
assertEqual(result, expected, 'Extract starting positions per set basic');

// Edge: non-array input
assertEqual(extractStartingPositionsPerSet(null), {}, 'Extract with null input returns {}');
assertEqual(extractStartingPositionsPerSet([]), {}, 'Extract with empty array returns {}');

console.log('Lineup utils tests complete');
