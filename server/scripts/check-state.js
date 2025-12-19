const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function checkState() {
  await client.connect();
  try {
    const res = await client.query("SELECT * FROM game_state WHERE id = 1");
    console.log('Game State:', JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

checkState();
