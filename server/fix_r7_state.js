
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixState() {
  try {
    console.log('Forcing Hearts Game State to ACTING...');
    await pool.query("UPDATE hearts_game_state SET status = 'acting' WHERE id = 1");
    const res = await pool.query("SELECT * FROM hearts_game_state WHERE id = 1");
    console.log('Current State:', res.rows[0]);
    
    // Also clear any stuck actions if we are resetting
    // await pool.query("UPDATE hearts_players SET current_action = NULL"); 
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fixState();
