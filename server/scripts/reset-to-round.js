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
        await client.query("UPDATE game_state SET current_round = $1, status = 'active' WHERE id = 1", [targetRound]);
        console.log(`Game state updated: Round ${targetRound}, Status: active`);

        // 2. Clear data for target round and subsequent rounds
        
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

        if (targetRound === 1) {
            // Everyone is alive in Round 1
            await client.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
            console.log('All players resurrected for Round 1.');
        } 
        else if (targetRound === 2) {
            // Everyone starts Round 2 alive (Round 1 has no eliminations)
            await client.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
            console.log('All players resurrected for Round 2.');
        } 
        else if (targetRound === 3) {
            // Round 2 survivors: those in teams
            await client.query(`
                UPDATE users SET is_eliminated = true 
                WHERE role = 'player' 
                AND id NOT IN (
                    SELECT user1_id FROM teams WHERE round_formed = 2
                    UNION 
                    SELECT user2_id FROM teams WHERE round_formed = 2
                )
            `);
            await client.query(`
                UPDATE users SET is_eliminated = false 
                WHERE role = 'player' 
                AND id IN (
                    SELECT user1_id FROM teams WHERE round_formed = 2
                    UNION 
                    SELECT user2_id FROM teams WHERE round_formed = 2
                )
            `);
            console.log('Survival state restored to end of Round 2.');
        } 
        else if (targetRound === 4) {
            // Round 3 survivors: those in teams that didn't lose
            // (Based on Round 3 matches logic: safe if >= 2 positives)
            
            // First, reset everyone in a team to false, then eliminate based on matches
            await client.query(`
                UPDATE users SET is_eliminated = false 
                WHERE id IN (SELECT user1_id FROM teams UNION SELECT user2_id FROM teams)
            `);

            // Identify teams that failed Round 3
            const matchRes = await client.query('SELECT * FROM round3_matches WHERE status = \'finished\'');
            for (const match of matchRes.rows) {
                const processTeam = async (teamId, scores) => {
                    if (!teamId) return;
                    const positives = scores.filter(s => s === true).length;
                    const safe = positives >= 2;
                    if (!safe) {
                        await client.query(`
                            UPDATE users SET is_eliminated = true 
                            WHERE id IN (SELECT user1_id FROM teams WHERE id = $1 UNION SELECT user2_id FROM teams WHERE id = $1)
                        `, [teamId]);
                    }
                };
                await processTeam(match.team1_id, match.team1_scores);
                await processTeam(match.team2_id, match.team2_scores);
            }
            console.log('Survival state restored to end of Round 3.');
        }
        else if (targetRound === 5) {
            // Round 4 survivors: those in teams with 'pass' result
             await client.query(`
                UPDATE users SET is_eliminated = true 
                WHERE role = 'player'
            `);
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

        await client.query('COMMIT');
        console.log(`\nSUCCESS: Game reset to the beginning of Round ${targetRound}.`);
        console.log(`Previous data (R1 to R${targetRound - 1}) preserved.`);
        console.log(`Subsequent data (R${targetRound} and up) truncated.`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\nERROR DURING RESET:', err);
    } finally {
        await client.end();
    }
}

const args = process.argv.slice(2);
const round = parseInt(args[0]);

if (isNaN(round) || round < 1 || round > 5) {
    console.log('Usage: node scripts/reset-to-round.js <round_number>');
    console.log('Example: node scripts/reset-to-round.js 2  (Resets to start of R2, keeps R1)');
    process.exit(1);
}

resetToRound(round);
