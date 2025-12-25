const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

const volunteers = [
  { name: 'Upendra Raj Joshi', email: 'upendra@ices.edu' },
  { name: 'Nabin Regmi', email: 'nabin@ices.edu' },
  { name: 'Anurag Adhikari', email: 'anurag@ices.edu' },
  { name: 'Rakshya Raut', email: 'rakshya@ices.edu' },
  { name: 'Swostika Poudel', email: 'swostika@ices.edu' },
  { name: 'Aelu', email: 'baby@ices.edu' },
  { name: 'Dhiraj Kumar Chaurasiya', email: 'dhiraj@ices.edu' },
  { name: 'Samar Dotel', email: 'samar@ices.edu' },
  { name: 'Priya Jha', email: 'priya@ices.edu' },
  { name: 'Yojana Ghimire', email: 'yojana@ices.edu' },
  { name: 'Swarn Kumar Chaudhary', email: 'swarn@ices.edu' },
  { name: 'Rabin Poudel', email: 'rabin@ices.edu' },
  { name: 'Aayushma Khanal', email: 'aayushma@ices.edu' },
  { name: 'Abhinaya Chaurasiya', email: 'abhinaya@ices.edu' },
  { name: 'Pradeep Bhandari', email: 'pradeep@ices.edu' },
  { name: 'Santosh Regmi', email: 'santosh@ices.edu' },
  { name: 'Roman Shrestha', email: 'roman@ices.edu' }
];

async function seed() {
  try {
    await client.connect();
    console.log('Connected to database');

    const passwordHash = await bcrypt.hash('helloworld', 10);

    for (const volunteer of volunteers) {
      try {
        await client.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
          [volunteer.name, volunteer.email, passwordHash, 'volunteer']
        );
        console.log(`Added volunteer: ${volunteer.name}`);
      } catch (err) {
        console.error(`Error adding ${volunteer.name}:`, err.message);
      }
    }

    console.log('Seeding complete');
  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await client.end();
  }
}

seed();
