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
  try {
    await client.connect();
  } catch (err) {
    if (err.code === '3D000') {
      console.error('ERROR: The target database does not exist. Please create the database or check your DATABASE_URL.');
      process.exit(0);
    } else {
      console.error('ERROR: Could not connect to database:', err);
      process.exit(1);
    }
  }

  try {
    console.log('--- STARTING COMPLETE DATABASE RESET ---');
    await client.query('BEGIN');

    // 1. Truncate all tables dynamically
    console.log('Fetching tables to truncate...');
        // Explicitly truncate all tables except pgmigrations
        const tables = [
          'game_state',
          'hearts_game_state',
          'hearts_players',
          'lottery_pool',
          'round3_matches',
          'round4_sessions',
          'round5_games',
          'round5_turns',
          'round6_history',
          'round6_state',
          'round6_votes',
          'submissions',
          'teams',
          'users'
        ];
        console.log(`Truncating tables: ${tables.join(', ')}...`);
        await client.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`);

    // 2. Reset Game State to Round 0
    console.log('Resetting game states...');
    await client.query("INSERT INTO game_state (id, current_round, status) VALUES (1, 0, 'waiting')");
    await client.query("INSERT INTO round6_state (id, current_cycle, status) VALUES (1, 1, 'waiting')");
    await client.query("INSERT INTO hearts_game_state (id, current_cycle, status) VALUES (1, 1, 'acting')");

    await client.query('COMMIT');
    console.log('--- RESET COMPLETE ---');
      console.log('Status: All accounts and data cleared. Game state reset to Round 0.');
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
