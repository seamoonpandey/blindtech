const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function resetForTeamTest() {
  await client.connect();
  try {
    // Reset players
    await client.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
    // Clear teams
    await client.query("DELETE FROM teams");
    // Clear lottery pool
    await client.query("UPDATE lottery_pool SET is_taken = false, taken_by = NULL");
    
    console.log('Reset state for team name testing.');
    
    // Find a selector and a leader
    const selectorRes = await client.query(`
      SELECT email, name FROM users 
      WHERE role = 'player' 
      AND id NOT IN (SELECT (content->>'id')::uuid FROM lottery_pool WHERE content->>'type' = 'player')
      LIMIT 1
    `);
    
    const leaderRes = await client.query(`
      SELECT email, name FROM users 
      WHERE role = 'player' 
      AND id IN (SELECT (content->>'id')::uuid FROM lottery_pool WHERE content->>'type' = 'player')
      LIMIT 1
    `);
    
    console.log('Test Selector:', selectorRes.rows[0]);
    console.log('Test Leader:', leaderRes.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

resetForTeamTest();
