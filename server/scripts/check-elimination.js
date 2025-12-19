const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function checkEliminated() {
  await client.connect();
  try {
    const res = await client.query("SELECT count(*) FROM users WHERE is_eliminated = true AND role = 'player'");
    console.log('Eliminated Players:', res.rows[0].count);
    
    const teamsRes = await client.query("SELECT count(*) FROM teams WHERE round_formed = 2");
    console.log('Teams Formed in Round 2:', teamsRes.rows[0].count);

    const totalRes = await client.query("SELECT count(*) FROM users WHERE role = 'player'");
    console.log('Total Players:', totalRes.rows[0].count);
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

checkEliminated();
