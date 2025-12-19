const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

const players = [
  { name: 'Aarav Sharma', email: 'aarav.sharma@example.com' },
  { name: 'Aditi Verma', email: 'aditi.verma@example.com' },
  { name: 'Arjun Gupta', email: 'arjun.gupta@example.com' },
  { name: 'Ananya Iyer', email: 'ananya.iyer@example.com' },
  { name: 'Ishaan Malhotra', email: 'ishaan.malhotra@example.com' },
  { name: 'Kavya Reddy', email: 'kavya.reddy@example.com' },
  { name: 'Rohan Mehra', email: 'rohan.mehra@example.com' },
  { name: 'Sanya Kapoor', email: 'sanya.kapoor@example.com' },
  { name: 'Vihaan Singh', email: 'vihaan.singh@example.com' },
  { name: 'Zoya Khan', email: 'zoya.khan@example.com' },
  { name: 'Liam Wilson', email: 'liam.wilson@example.com' },
  { name: 'Emma Thompson', email: 'emma.thompson@example.com' },
  { name: 'Noah Garcia', email: 'noah.garcia@example.com' },
  { name: 'Olivia Martinez', email: 'olivia.martinez@example.com' },
  { name: 'William Brown', email: 'william.brown@example.com' },
  { name: 'Sophia Davis', email: 'sophia.davis@example.com' },
  { name: 'James Miller', email: 'james.miller@example.com' },
  { name: 'Isabella Rodriguez', email: 'isabella.rodriguez@example.com' },
  { name: 'Benjamin Moore', email: 'benjamin.moore@example.com' },
  { name: 'Mia Taylor', email: 'mia.taylor@example.com' },
  { name: 'Lucas Anderson', email: 'lucas.anderson@example.com' },
  { name: 'Charlotte Thomas', email: 'charlotte.thomas@example.com' },
  { name: 'Henry Jackson', email: 'henry.jackson@example.com' },
  { name: 'Amelia White', email: 'amelia.white@example.com' },
  { name: 'Alexander Harris', email: 'alexander.harris@example.com' },
  { name: 'Evelyn Martin', email: 'evelyn.martin@example.com' },
  { name: 'Daniel Lewis', email: 'daniel.lewis@example.com' },
  { name: 'Harper Walker', email: 'harper.walker@example.com' },
  { name: 'Matthew Young', email: 'matthew.young@example.com' },
  { name: 'Abigail King', email: 'abigail.king@example.com' }
];

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
