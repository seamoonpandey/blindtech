const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function reset() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('--- STARTING DATABASE RESET ---');
    await client.query('BEGIN');

    // 1. Truncate all tables
    console.log('Truncating tables...');
    await client.query('TRUNCATE users, teams, round3_matches, lottery_pool, submissions, game_state CASCADE');

    // 2. Reset Game State
    console.log('Resetting game state...');
    await client.query("INSERT INTO game_state (id, current_round, status) VALUES (1, 0, 'waiting')");

    // 3. Seed Users
    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const players = [];
    for (let i = 1; i <= 40; i++) {
      const res = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name',
        [`Player ${i}`, `player${i}@test.com`, passwordHash, 'player']
      );
      players.push(res.rows[0]);
    }

    const volunteers = [];
    for (let i = 1; i <= 5; i++) {
      const res = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name',
        [`Volunteer ${i}`, `vol${i}@test.com`, passwordHash, 'volunteer']
      );
      volunteers.push(res.rows[0]);
    }

    // 4. Simulate Round 2 Finished State with 11 Teams
    console.log('Simulating Round 2 formation...');
    
    const leaders = players.slice(0, 20);
    const selectors = players.slice(20, 40);

    const TEAM_NAMES = [
      "The Bug Hunters", "Null Pointers", "Merge Conflict", "Stack Overflow", 
      "Binary Beasts", "Code Ninjas", "Logic Bombs", "The Bit Shifters",
      "Git Pushers", "Async Avengers", "The Solo Hackers"
    ];

    // Create 11 Successful Teams
    for (let i = 0; i < 11; i++) {
        const leader = leaders[i];
        const selector = selectors[i];
        const teamName = TEAM_NAMES[i];
        
        await client.query(
            'INSERT INTO teams (user1_id, user2_id, round_formed, name) VALUES ($1, $2, 2, $3)',
            [selector.id, leader.id, teamName]
        );

        await client.query(
            'INSERT INTO lottery_pool (content, is_taken, taken_by) VALUES ($1, $2, $3)',
            [JSON.stringify({ type: 'player', id: leader.id, name: leader.name }), true, selector.id]
        );
        
        console.log(`Team Created: ${teamName} (${selector.name} + ${leader.name})`);
    }

    const QUOTES = [
        "The system has no mercy.", 
        "Efficiency is the only virtue.",
        "Your silence is your best weapon."
    ];

    // 5. Eliminate selectors who picked quotes
    for (let i = 11; i < 20; i++) {
        const selector = selectors[i];
        const quote = QUOTES[(i - 11) % QUOTES.length];

        await client.query(
            'INSERT INTO lottery_pool (content, is_taken, taken_by) VALUES ($1, $2, $3)',
            [JSON.stringify({ type: 'quote', text: quote }), true, selector.id]
        );

        await client.query('UPDATE users SET is_eliminated = true WHERE id = $1', [selector.id]);
        console.log(`Selector Eliminated: ${selector.name} picked a death card.`);
    }

    // 6. Eliminate unpicked leaders
    for (let i = 11; i < 20; i++) {
        const leader = leaders[i];
        
        await client.query(
            'INSERT INTO lottery_pool (content, is_taken, taken_by) VALUES ($1, $2, $3)',
            [JSON.stringify({ type: 'player', id: leader.id, name: leader.name }), false, null]
        );

        await client.query('UPDATE users SET is_eliminated = true WHERE id = $1', [leader.id]);
        console.log(`Leader Eliminated: ${leader.name} was not picked.`);
    }

    // Add remaining quotes to pool
    for (let i = 0; i < 9; i++) {
        const quote = QUOTES[i % QUOTES.length];
        await client.query(
            'INSERT INTO lottery_pool (content, is_taken, taken_by) VALUES ($1, $2, $3)',
            [JSON.stringify({ type: 'quote', text: quote }), false, null]
        );
    }

    // 7. Set Game State to Round 2 Finished
    console.log('Finalizing game state...');
    await client.query("UPDATE game_state SET current_round = 2, status = 'finished' WHERE id = 1");

    await client.query('COMMIT');
    console.log('--- RESET COMPLETE ---');
    console.log('Total Players: 40');
    console.log('Total Teams: 11');
    console.log('Status: Round 2 Finished, Ready for Round 3');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR DURING RESET:', err);
  } finally {
    await client.end();
  }
}

reset();
