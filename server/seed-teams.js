const { Client } = require('pg');

const DATABASE_URL = 'postgres://postgres@localhost:5432/blindtech';

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    console.log('Resetting game state, teams, and lottery pool...');
    await client.query('BEGIN');

    // Reset eliminations for players
    await client.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");

    // Clear existing data
    await client.query('DELETE FROM round3_matches');
    await client.query('DELETE FROM teams');
    await client.query('DELETE FROM lottery_pool');

    // Get all 40 players
    const allPlayersRes = await client.query("SELECT id, name FROM users WHERE role = 'player' ORDER BY RANDOM()");
    const allPlayers = allPlayersRes.rows;

    if (allPlayers.length < 40) {
      console.log(`Warning: Only ${allPlayers.length} players found. Proceeding anyway.`);
    }

    // Round 2 Mechanics Simulation:
    // Split players into Leaders (20) and Selectors (20)
    const leaders = allPlayers.slice(0, 20);
    const selectors = allPlayers.slice(20, 40);

    const TEAM_NAMES = [
      "The Bug Hunters", "Null Pointers", "Merge Conflict", "Stack Overflow", 
      "Binary Beasts", "Code Ninjas", "Logic Bombs", "The Bit Shifters",
      "Git Pushers", "Async Avengers"
    ];

    // Create 40 cards in the lottery pool
    // 20 of them will be 'player' cards (the leaders), 20 will be 'elimination' cards (quotes)
    
    // 1. Create 20 player cards
    for (let i = 0; i < 20; i++) {
        const leader = leaders[i];
        let isTaken = false;
        let takenBy = null;
        
        // Match first 10 leaders with first 10 selectors
        if (i < 10) {
            isTaken = true;
            takenBy = selectors[i].id;
            const teamName = TEAM_NAMES[i];
            
            // Create the team
            await client.query(
                'INSERT INTO teams (user1_id, user2_id, round_formed, name) VALUES ($1, $2, 2, $3)',
                [takenBy, leader.id, teamName]
            );
            console.log(`Team ${i+1}: ${selectors[i].name} (Selector) + ${leader.name} (Leader) -> ${teamName}`);
        }

        await client.query(
            'INSERT INTO lottery_pool (content, is_taken, taken_by) VALUES ($1, $2, $3)',
            [JSON.stringify({ type: 'player', id: leader.id, name: leader.name }), isTaken, takenBy]
        );
    }

    // 2. Create 20 elimination cards (some taken by the remaining 10 selectors who "failed")
    const quotes = [
        "The system has no mercy.", 
        "Efficiency is the only virtue.",
        "Your silence is your best weapon."
    ];

    for (let i = 0; i < 20; i++) {
        let isTaken = false;
        let takenBy = null;
        
        // The remaining 10 selectors pick elimination cards
        if (i >= 10 && i < 20) {
            isTaken = true;
            takenBy = selectors[i].id;
            // Eliminate them
            await client.query('UPDATE users SET is_eliminated = true WHERE id = $1', [takenBy]);
            console.log(`Eliminated: ${selectors[i].name} picked a death card.`);
        }

        await client.query(
            'INSERT INTO lottery_pool (content, is_taken, taken_by) VALUES ($1, $2, $3)',
            [JSON.stringify({ type: 'quote', text: quotes[i % quotes.length] }), isTaken, takenBy]
        );
    }

    // The remaining 10 leaders who weren't picked also get eliminated 
    // (In a real game they'd be eliminated if no one picked them by the end)
    for (let i = 10; i < 20; i++) {
        await client.query('UPDATE users SET is_eliminated = true WHERE id = $1', [leaders[i].id]);
        console.log(`Eliminated: Leader ${leaders[i].name} was not picked.`);
    }

    // Set game state to Round 2 Finished
    await client.query("UPDATE game_state SET current_round = 2, status = 'finished' WHERE id = 1");

    await client.query('COMMIT');
    console.log('\nSeeding complete.');
    console.log('Result: 10 Teams formed, 20 Players eliminated, 20 Players safe.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.log('Error seeding:', err);
  } finally {
    await client.end();
  }
}

seed();
