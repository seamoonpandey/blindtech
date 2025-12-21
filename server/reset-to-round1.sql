-- Reset game to Round 1
BEGIN;

-- Clear all game-related tables (in correct order to avoid FK constraints)
DELETE FROM round5_turns;
DELETE FROM round5_games;
DELETE FROM round4_sessions;
DELETE FROM round3_matches;
DELETE FROM submissions;
DELETE FROM teams;
DELETE FROM lottery_pool;
DELETE FROM hearts_players;
DELETE FROM hearts_game_state;

-- Reset game_state
UPDATE game_state 
SET 
  current_round = 0,
  status = 'waiting',
  updated_at = NOW()
WHERE id = 1;

-- Reset all users - un-eliminate everyone
UPDATE users 
SET 
  is_eliminated = false,
  has_used_safety = false
WHERE role = 'player';

COMMIT;

-- Success message
SELECT 'Game reset to Round 1 successfully! All players un-eliminated.' as message;
