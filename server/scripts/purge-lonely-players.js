const { Client } = require('pg');
require('dotenv').config();

// Standard connection string from your setup
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech';

async function eliminateLonelyPlayers() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('--- SYSTEM SCAN: SEARCHING FOR UNIT-LESS PLAYERS ---');

    // 1. Identify players who are NOT in any team formed in Round 2
    const query = `
      SELECT id, name 
      FROM users 
      WHERE role = 'player' 
        AND is_eliminated = false
        AND id NOT IN (
          SELECT user1_id FROM teams WHERE round_formed = 2
          UNION 
          SELECT user2_id FROM teams WHERE round_formed = 2
        )
    `;

    const res = await client.query(query);
    const lonelyPlayers = res.rows;

    if (lonelyPlayers.length === 0) {
      console.log('No unit-less players found. All active players have partners.');
    } else {
      console.log(`Found ${lonelyPlayers.length} players with no teammates. Commencing de-calibration...`);
      
      const idsToEliminate = lonelyPlayers.map(p => p.id);
      
      // 2. Eliminate them
      await client.query('UPDATE users SET is_eliminated = true WHERE id = ANY($1)', [idsToEliminate]);
      
      lonelyPlayers.forEach(p => {
        console.log(`[DE-CALIBRATED] ${p.name} (${p.id})`);
      });
      
      console.log('\nPurge complete.');
    }

    // 3. Optional: Sync Round 6 state if it's already running
    // This is useful if the game is already in the Final Round
    const r6Check = await client.query("SELECT id FROM hearts_game_state WHERE status != 'finished'");
    if (r6Check.rows.length > 0) {
      console.log('Round 6 is active. Removing purged players from hearts_players monitor...');
      await client.query('DELETE FROM hearts_players WHERE user_id = ANY($1)', [lonelyPlayers.map(p => p.id)]);
    }

  } catch (err) {
    console.error('CRITICAL ERROR DURING PURGE:', err);
  } finally {
    await client.end();
  }
}

eliminateLonelyPlayers();
