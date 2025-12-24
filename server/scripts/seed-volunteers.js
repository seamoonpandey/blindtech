const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

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

async function seed() {
  try {
    await client.connect();
    console.log('Connected to database');

    const passwordHash = await bcrypt.hash('password', 10);

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
