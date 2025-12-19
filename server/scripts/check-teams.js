const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function checkTeams() {
  await client.connect();
  try {
    const res = await client.query("SELECT * FROM teams");
    console.log('Teams:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

checkTeams();
