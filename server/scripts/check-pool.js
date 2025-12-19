const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function checkPool() {
  await client.connect();
  try {
    const res = await client.query('SELECT * FROM lottery_pool');
    console.log('Lottery Pool Items:', res.rows.length);
    console.log('Sample Item:', JSON.stringify(res.rows[0], null, 2));
    
    const taken = res.rows.filter(r => r.is_taken);
    console.log('Taken Items:', taken.length);
  } catch (err) {
    console.error('Error checking pool:', err.message);
  }
  await client.end();
}

checkPool();
