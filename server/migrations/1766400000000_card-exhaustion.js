/**
 * Card Exhaustion System for Round 5 (The Paradox)
 * 
 * Each player has a hand of 3 cards (Attack, Fortify, Converge).
 * When a card is used, it becomes exhausted and unavailable next sub-round.
 * Once all 3 cards are exhausted, the hand refreshes and all cards are available again.
 * 
 * This creates a 3-turn cycle:
 *   Round 1: All 3 available
 *   Round 2: 2 remaining
 *   Round 3: Last card forced
 *   Round 4: All 3 restored (repeat)
 */

exports.up = (pgm) => {
  // Track exhausted cards for each team
  // Format: ['ATTACK', 'FORTIFY'] means those cards are exhausted
  pgm.addColumn('round5_games', {
    team_a_exhausted_cards: {
      type: 'jsonb',
      default: '[]',
      notNull: true
    },
    team_b_exhausted_cards: {
      type: 'jsonb',
      default: '[]',
      notNull: true
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('round5_games', 'team_a_exhausted_cards');
  pgm.dropColumn('round5_games', 'team_b_exhausted_cards');
};
