const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function resetToRound(targetRound) {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        console.log(`\n=== RESETTING GAME TO ROUND ${targetRound} ===`);
        await client.query('BEGIN');

        // 1. Update Game State
        // For rounds >= 2, we set to 'waiting' so the volunteer can trigger the official start/seeding logic.
        const status = targetRound === 1 ? 'active' : 'waiting';
        await client.query("UPDATE game_state SET current_round = $1, status = $2 WHERE id = 1", [targetRound, status]);
        console.log(`Game state updated: Round ${targetRound}, Status: ${status}`);

        // 2. Clear data for target round and subsequent rounds
        
        // Round 7
        if (targetRound <= 7) {
            console.log('Cleaning up Round 7...');
            await client.query('DELETE FROM hearts_players');
            await client.query("UPDATE hearts_game_state SET current_cycle = 1, status = 'waiting', winner_id = NULL WHERE id = 1");
        }

        // Round 6
        if (targetRound <= 6) {
            console.log('Cleaning up Round 6...');
            await client.query('DELETE FROM round6_votes');
            await client.query('DELETE FROM round6_history');
            await client.query("UPDATE round6_state SET current_cycle = 1, status = 'waiting' WHERE id = 1");
        }

        // Round 5
        if (targetRound <= 5) {
            console.log('Cleaning up Round 5...');
            await client.query('DELETE FROM round5_turns');
            await client.query('DELETE FROM round5_games');
        }

        // Round 4
        if (targetRound <= 4) {
            console.log('Cleaning up Round 4...');
            await client.query('DELETE FROM round4_sessions');
        }

        // Round 3
        if (targetRound <= 3) {
            console.log('Cleaning up Round 3...');
            await client.query('DELETE FROM round3_matches');
        }

        // Round 2
        if (targetRound <= 2) {
            console.log('Cleaning up Round 2...');
            await client.query('DELETE FROM teams WHERE round_formed >= 2');
            await client.query('DELETE FROM lottery_pool');
        }

        // Round 1
        if (targetRound <= 1) {
            console.log('Cleaning up Round 1...');
            await client.query('DELETE FROM submissions');
        }

        // 3. Restore elimination status based on the PREVIOUS round's results
        console.log('Restoring survival states...');

        if (targetRound === 1 || targetRound === 2) {
            // Everyone is alive in Round 1 & 2
            await client.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
            console.log('All players resurrected.');
        } 
        else if (targetRound === 3) {
            // Round 2 survivors: those in teams
            await client.query(`UPDATE users SET is_eliminated = true WHERE role = 'player'`);
            await client.query(`
                UPDATE users SET is_eliminated = false 
                WHERE id IN (
                    SELECT user1_id FROM teams WHERE round_formed = 2
                    UNION 
                    SELECT user2_id FROM teams WHERE round_formed = 2
                )
            `);
            console.log('Survival state restored to end of Round 2.');
        } 
        else if (targetRound === 4) {
            // Round 3 survivors: those in teams that didn't lose
            await client.query(`UPDATE users SET is_eliminated = false WHERE id IN (SELECT user1_id FROM teams UNION SELECT user2_id FROM teams)`);
            const matchRes = await client.query('SELECT * FROM round3_matches WHERE status = \'finished\'');
            for (const match of matchRes.rows) {
                const processTeam = async (teamId, scores) => {
                    if (!teamId) return;
                    const positives = scores.filter(s => s === true).length;
                    if (positives < 2) {
                        await client.query(`UPDATE users SET is_eliminated = true WHERE id IN (SELECT user1_id FROM teams WHERE id = $1 UNION SELECT user2_id FROM teams WHERE id = $1)`, [teamId]);
                    }
                };
                await processTeam(match.team1_id, match.team1_scores);
                await processTeam(match.team2_id, match.team2_scores);
            }
            console.log('Survival state restored to end of Round 3.');
        }
        else if (targetRound === 5) {
            // Round 4 survivors: those in teams with 'pass' result
             await client.query(`UPDATE users SET is_eliminated = true WHERE role = 'player'`);
            await client.query(`
                UPDATE users SET is_eliminated = false 
                WHERE id IN (
                    SELECT t.user1_id FROM teams t JOIN round4_sessions s ON t.id = s.team_id WHERE s.result = 'pass'
                    UNION
                    SELECT t.user2_id FROM teams t JOIN round4_sessions s ON t.id = s.team_id WHERE s.result = 'pass'
                )
            `);
            console.log('Survival state restored to end of Round 4.');
        }
        else if (targetRound === 6) {
            // Round 5 survivors: winners of paradox games
            await client.query(`UPDATE users SET is_eliminated = true WHERE role = 'player'`);
            await client.query(`
                UPDATE users SET is_eliminated = false 
                WHERE id IN (
                    SELECT t.user1_id FROM teams t JOIN round5_games g ON t.id = g.team_a_id WHERE g.result = 'team_a_won' OR g.result = 'both_won_manual'
                    UNION
                    SELECT t.user2_id FROM teams t JOIN round5_games g ON t.id = g.team_a_id WHERE g.result = 'team_a_won' OR g.result = 'both_won_manual'
                    UNION
                    SELECT t.user1_id FROM teams t JOIN round5_games g ON t.id = g.team_b_id WHERE g.result = 'team_b_won' OR g.result = 'both_won_manual'
                    UNION
                    SELECT t.user2_id FROM teams t JOIN round5_games g ON t.id = g.team_b_id WHERE g.result = 'team_b_won' OR g.result = 'both_won_manual'
                )
            `);
            console.log('Survival state restored to end of Round 5.');
        }
        else if (targetRound === 7) {
            // Round 6 survivors: those not eliminated in voting
            // Note: Since Round 6 is active survival, we check the current is_eliminated status 
            // but for a reset we might want to just check who is currently alive in the DB
            // OR we can't perfectly reconstruct R6 middle state, so we just assume the GM has marked them.
            // For now, let's just keep current status but ensure teams are intact if necessary.
            console.log('Survival state preserved from current DB status for Round 7 reset.');
        }

        await client.query('COMMIT');
        console.log(`\nSUCCESS: Game reset to the beginning of Round ${targetRound}.`);
        console.log(`Previous data (R1 to R${targetRound - 1}) preserved.`);
        console.log(`Subsequent data (R${targetRound} and up) truncated.`);

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        console.error('\nERROR DURING RESET:', err);
    } finally {
        await client.end();
    }
}

const args = process.argv.slice(2);
const round = parseInt(args[0]);

if (isNaN(round) || round < 1 || round > 7) {
    console.log('Usage: node scripts/reset-to-round.js <round_number>');
    console.log('Example: node scripts/reset-to-round.js 6  (Resets to start of Pigeon Round)');
    process.exit(1);
}

resetToRound(round);
