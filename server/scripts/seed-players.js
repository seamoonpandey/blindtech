const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

const players = Array.from({ length: 30 }, (_, i) => {
  const num = i + 1;
  return {
    name: `dummy${num}`,
    email: `dummy${num}@example.com`
  };
});

async function seed() {
  await client.connect();
  console.log('Connected to database');

  const passwordHash = await bcrypt.hash('password', 10);

  for (const player of players) {
    try {
      await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        [player.name, player.email, passwordHash, 'player']
      );
      console.log(`Added player: ${player.name}`);
    } catch (err) {
      console.error(`Error adding ${player.name}:`, err.message);
    }
  }

  await client.end();
  console.log('Seeding complete');
}

seed();
