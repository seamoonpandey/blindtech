const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function checkTaken() {
  await client.connect();
  try {
    const res = await client.query('SELECT u.name, lp.content FROM lottery_pool lp JOIN users u ON lp.taken_by = u.id WHERE lp.is_taken = true');
    console.log('Taken selections:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error checking taken:', err.message);
  }
  await client.end();
}

checkTaken();
