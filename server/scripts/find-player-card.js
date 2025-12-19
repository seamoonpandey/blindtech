const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function findPlayerCard() {
  await client.connect();
  try {
    const res = await client.query("SELECT id, content FROM lottery_pool WHERE content->>'type' = 'player' AND is_taken = false LIMIT 1");
    if (res.rows.length > 0) {
      console.log('Found Player Card:');
      console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
      console.log('No untaken player cards found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

findPlayerCard();
