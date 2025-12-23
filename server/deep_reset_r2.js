const db = require('./db');

async function reset() {
  try {
    console.log('Starting deep reset to Round 2...');
    await db.query('BEGIN');

    // 1. Reset Game State to Round 2 Active (Lottery Phase)
    await db.query("UPDATE game_state SET current_round = 2, status = 'active' WHERE id = 1");

    // 2. Fresh Users (Un-eliminate everyone)
    await db.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
    await db.query("UPDATE users SET has_used_safety = false");

    // 3. Clear Round 1 Submissions (the "votes")
    await db.query("DELETE FROM submissions");
    
    // 4. Clear Future Round Data
    await db.query("DELETE FROM round5_turns");
    await db.query("DELETE FROM round5_games");
    await db.query("DELETE FROM round4_sessions");
    await db.query("DELETE FROM round3_matches");
    
    // 5. Reset Round 2 (Lottery) - Clear teams and reset pool
    await db.query("DELETE FROM teams WHERE round_formed >= 2");
    await db.query("UPDATE lottery_pool SET is_taken = false, taken_by = NULL");

    // 6. Reset Round 6 State (Game of Hearts)
    await db.query("DELETE FROM hearts_players");
    await db.query(`
      UPDATE hearts_game_state 
      SET current_cycle = 1, status = 'waiting', winner_id = NULL 
      WHERE id = 1
    `);

    await db.query('COMMIT');
    console.log('RESET SUCCESSFUL: Game is now set to Round 2 (Lottery Transition).');
    console.log('All players have been revived, R1 submissions cleared, and all R2+ data purged.');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL RESET FAILURE:', err);
    process.exit(1);
  }
}

reset();
