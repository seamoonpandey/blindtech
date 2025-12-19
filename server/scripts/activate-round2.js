const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function activateRound2() {
  await client.connect();
  try {
    await client.query("UPDATE game_state SET status = 'active' WHERE id = 1 AND current_round = 2");
    console.log('Round 2 activated');
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

activateRound2();
