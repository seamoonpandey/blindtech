const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function createAdmin() {
  await client.connect();
  const passwordHash = await bcrypt.hash('admin123', 10);
  try {
    await client.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET role = $4',
      ['Admin', 'admin@blindtech.exe', passwordHash, 'volunteer']
    );
    console.log('Admin user created/updated');
  } catch (err) {
    console.error('Error creating admin:', err.message);
  }
  await client.end();
}

createAdmin();
