const db = require('./db');

async function skip() {
  try {
    console.log('Skipping Round 5 and setting up history...');

    // 1. Get all Round 2 teams
    const teamsRes = await db.query("SELECT * FROM teams WHERE round_formed = 2");
    const teams = teamsRes.rows;
    console.log(`Found ${teams.length} teams.`);

    // 2. Clear previous Round 5 data
    await db.query("DELETE FROM round5_turns");
    await db.query("DELETE FROM round5_games");

    // 3. Create mock games and history
    for (let i = 0; i < teams.length; i += 2) {
      const teamA = teams[i];
      const teamB = teams[i+1];
      if (!teamB) break; // Should be even number of teams usually

      const gameIdRes = await db.query(`
        INSERT INTO round5_games (team_a_id, team_b_id, team_a_momentum, team_b_momentum, current_round, status, result, team_a_turn_order, team_b_turn_order)
        VALUES ($1, $2, 10, 10, 2, 'finished', 'both_win', $3, $4)
        RETURNING id
      `, [
        teamA.id, 
        teamB.id, 
        JSON.stringify([teamA.user1_id, teamA.user2_id]), 
        JSON.stringify([teamB.user1_id, teamB.user2_id])
      ]);
      const gameId = gameIdRes.rows[0].id;

      // Mock turns for Round 1 (Both CONVERGE = Mutual Survival)
      await db.query(`
        INSERT INTO round5_turns (game_id, round_number, player_id, team, card_selected, is_revealed)
        VALUES 
        ($1, 1, $2, 'A', 'CONVERGE', true),
        ($1, 1, $3, 'B', 'CONVERGE', true)
      `, [gameId, teamA.user1_id, teamB.user1_id]);

      console.log(`Created mock game ${gameId} for Teams ${teamA.id} and ${teamB.id}`);
    }

    // 4. Set Global State to Round 6
    await db.query("UPDATE game_state SET current_round = 6, status = 'active' WHERE id = 1");
    console.log('Game state set to Round 6 ACTIVE');

    // 5. Initialize Round 6 State
    await db.query("DELETE FROM round6_state");
    await db.query(`
      INSERT INTO round6_state (id, current_subround, subround_status, voting_started_at)
      VALUES (1, 1, 'waiting', NULL)
    `);
    await db.query("DELETE FROM round6_votes");
    await db.query("DELETE FROM round6_history");
    console.log('Round 6 initialized');

    // 6. Ensure everyone is alive
    await db.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
    console.log('All players uneliminated for Pigeon Round');

    console.log('Skip complete! Restarting server...');
    process.exit(0);
  } catch (err) {
    console.error('Skip failed:', err);
    process.exit(1);
  }
}

skip();
