const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ 
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' 
});

async function checkVolunteers() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    const res = await client.query(
      'SELECT id, name, email, role FROM users WHERE role = $1 ORDER BY name ASC',
      ['volunteer']
    );

    if (res.rows.length === 0) {
      console.log('No volunteers found in the database.');
    } else {
      console.log(`Found ${res.rows.length} volunteers:\n`);
      console.table(res.rows);
    }

  } catch (err) {
    console.error('Error checking volunteers:', err.message);
  } finally {
    await client.end();
  }
}

checkVolunteers();
