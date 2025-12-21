const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = 'postgres://postgres@localhost:5432/blindtech';

async function reset() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    console.log('--- RESETTING FINAL LEVEL WITH TEAMS ---');
    
    // 1. Reset Global Hearts State
    await client.query('UPDATE hearts_game_state SET current_cycle = 1, status = \'acting\', winner_id = NULL WHERE id = 1');
    
    // 2. Clear activities
    await client.query('UPDATE hearts_players SET current_action = NULL, target_id = NULL');

    // 3. Define the 4 survivors (from 2 teams)
    const survivors = ['Player 25', 'Player 7', 'Player 12', 'Player 9'];

    // 4. Update Users table
    await client.query("UPDATE users SET is_eliminated = true WHERE role = 'player'");
    await client.query("UPDATE users SET is_eliminated = false WHERE name = ANY($1)", [survivors]);

    // 5. Update Hearts Players table
    await client.query("UPDATE hearts_players SET hearts = 0, is_alive = false");
    
    // Get their IDs
    const userRes = await client.query("SELECT id, name FROM users WHERE name = ANY($1)", [survivors]);
    for (const row of userRes.rows) {
        await client.query("UPDATE hearts_players SET hearts = 3, is_alive = true WHERE user_id = $1", [row.id]);
        console.log(`Restored Survivor: ${row.name}`);
    }

    // 6. Ensure main game state is correct
    await client.query("UPDATE game_state SET current_round = 6, status = 'active' WHERE id = 1");

    console.log('--- RESET COMPLETE ---');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

reset();
