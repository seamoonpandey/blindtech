const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function checkMoon() {
  await client.connect();
  try {
    const res = await client.query("SELECT id, name, email, role FROM users WHERE email = 'moon@test.io'");
    console.log('Moon User:', JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

checkMoon();
