const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function getCardIndex() {
  await client.connect();
  try {
    // The pool is sent to frontend in the order it was inserted (or by ID if not specified, but usually insertion order)
    // In game.js: const poolRes = await db.query('SELECT id, is_taken, taken_by FROM lottery_pool');
    // Since there's no ORDER BY, it's usually insertion order.
    const res = await client.query('SELECT id, content FROM lottery_pool');
    const index = res.rows.findIndex(r => r.id === 'cec54330-e072-4568-ab95-93f539b90fce');
    console.log('Card Index:', index);
    console.log('Total Cards:', res.rows.length);
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

getCardIndex();
