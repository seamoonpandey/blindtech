const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({ 
  connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' 
});

async function seed() {
  try {
    await client.connect();
    console.log('Connected to database');

    const passwordHash = await bcrypt.hash('password123', 10);
    const dummyUsers = [];

    for (let i = 1; i <= 20; i++) {
      dummyUsers.push({
        name: `Dummy User ${i}`,
        email: `dummy${i}@example.com`,
        password_hash: passwordHash,
        role: 'player'
      });
    }

    console.log(`Seeding ${dummyUsers.length} dummy users...`);

    for (const user of dummyUsers) {
      await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        [user.name, user.email, user.password_hash, user.role]
      );
    }

    console.log('Successfully seeded dummy users.');
  } catch (err) {
    console.error('Error seeding dummy users:', err);
  } finally {
    await client.end();
  }
}

seed();
