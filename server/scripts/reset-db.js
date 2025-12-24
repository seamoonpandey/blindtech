const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

const volunteers = [
  { name: 'Sagar Sharma', email: 'volunteer1@blindtech.com' },
  { name: 'Pratiksha Paudel', email: 'volunteer2@blindtech.com' },
  { name: 'Aayush Adhikari', email: 'volunteer3@blindtech.com' },
  { name: 'Binita Dahal', email: 'volunteer4@blindtech.com' },
  { name: 'Rohan Shrestha', email: 'volunteer5@blindtech.com' },
  { name: 'Anjali Thapa', email: 'volunteer6@blindtech.com' },
  { name: 'Sushant Karki', email: 'volunteer7@blindtech.com' },
  { name: 'Deepa Gurung', email: 'volunteer8@blindtech.com' },
  { name: 'Niraj Tamang', email: 'volunteer9@blindtech.com' },
  { name: 'Shreya Magar', email: 'volunteer10@blindtech.com' },
  { name: 'Bimal Rai', email: 'volunteer11@blindtech.com' },
  { name: 'Kabita Bista', email: 'volunteer12@blindtech.com' },
  { name: 'Sailesh Khatri', email: 'volunteer13@blindtech.com' },
  { name: 'Pooja Bhandari', email: 'volunteer14@blindtech.com' },
  { name: 'Rahul Neupane', email: 'volunteer15@blindtech.com' },
  { name: 'Manisha Gautam', email: 'volunteer16@blindtech.com' },
  { name: 'Bibek Basnet', email: 'volunteer17@blindtech.com' },
  { name: 'Sabina Khadka', email: 'volunteer18@blindtech.com' },
  { name: 'Manish Acharya', email: 'volunteer19@blindtech.com' },
  { name: 'Kriti Sapkota', email: 'volunteer20@blindtech.com' }
];

async function reset() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('--- STARTING COMPLETE DATABASE RESET ---');
    await client.query('BEGIN');

    // 1. Truncate all tables dynamically
    console.log('Fetching tables to truncate...');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name != 'pgmigrations'
    `);
    
    const tables = tablesRes.rows.map(r => r.table_name);
    
    if (tables.length > 0) {
      console.log(`Truncating tables: ${tables.join(', ')}...`);
      await client.query(`TRUNCATE ${tables.join(', ')} CASCADE`);
    } else {
      console.log('No tables to truncate.');
    }

    // 2. Reset Game State to Round 0
    console.log('Resetting game state...');
    await client.query("INSERT INTO game_state (id, current_round, status) VALUES (1, 0, 'waiting')");

    // 3. Seed Volunteers
    console.log('Seeding volunteers...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Add Admin first
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await client.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Admin', 'admin@blindtech.exe', adminPasswordHash, 'volunteer']
    );
    console.log('Added admin: Admin');

    for (const vol of volunteers) {
      await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [vol.name, vol.email, passwordHash, 'volunteer']
      );
      console.log(`Added volunteer: ${vol.name}`);
    }

    await client.query('COMMIT');
    console.log('--- RESET COMPLETE ---');
    console.log(`Total Volunteers Added: ${volunteers.length + 1} (including admin)`);
    console.log('Status: All other accounts and data cleared. Game state reset to Round 0.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR DURING RESET:', err);
  } finally {
    await client.end();
  }
}

reset();
