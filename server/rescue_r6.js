const { Client } = require('pg');
require('dotenv').config();

const DATABASE_URL = 'postgres://postgres@localhost:5432/blindtech';

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    console.log('--- RESCUING ROUND 6 INITIALIZATION ---');
    
    // Clear old data
    await client.query('DELETE FROM hearts_players');
    await client.query('UPDATE hearts_game_state SET current_cycle = 1, status = $1, winner_id = NULL WHERE id = 1', ['waiting']);
    
    // Get survivors
    const alivePlayers = await client.query("SELECT id, name FROM users WHERE role = 'player' AND is_eliminated = false");
    const teams = await client.query("SELECT * FROM teams WHERE round_formed = 2");
    
    console.log(`Found ${alivePlayers.rows.length} survivors.`);
    
    for (const p of alivePlayers.rows) {
      const myTeam = teams.rows.find(t => t.user1_id === p.id || t.user2_id === p.id);
      const teammateId = myTeam ? (myTeam.user1_id === p.id ? myTeam.user2_id : myTeam.user1_id) : null;
      
      await client.query(`
        INSERT INTO hearts_players (user_id, teammate_id, hearts, is_alive)
        VALUES ($1, $2, 3, true)
      `, [p.id, teammateId]);
      console.log(`Initialized ${p.name}`);
    }
    
    // Update main game state
    await client.query("UPDATE game_state SET current_round = 6, status = 'active' WHERE id = 1");
    
    console.log('--- RECOVERY COMPLETE ---');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
