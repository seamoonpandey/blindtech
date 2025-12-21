const db = require('./db');

async function reset() {
  try {
    console.log('Starting reset...');
    await db.query("UPDATE game_state SET current_round = 4, status = 'waiting' WHERE id = 1");
    console.log('Game state set to Round 4 waiting (ready to re-start Round 5)');
    
    await db.query("DELETE FROM round5_turns");
    await db.query("DELETE FROM round5_games");
    console.log('Round 5 data cleared');
    
    await db.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
    console.log('All players uneliminated');
    
    await db.query("UPDATE users SET has_used_safety = false");
    console.log('Safety tokens reset');
    
    await db.query("DELETE FROM round6_state");
    await db.query("INSERT INTO round6_state (id, current_subround, subround_status, voting_started_at) VALUES (1, 1, 'waiting', NULL)");
    console.log('Round 6 state reset');
    
    await db.query("DELETE FROM round6_votes");
    await db.query("DELETE FROM round6_history");
    console.log('Round 6 votes and history cleared');
    
    console.log('Reset complete! Please restart the server or wait for next heartbeat.');
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
}

reset();
