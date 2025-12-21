exports.up = (pgm) => {
  // Drop previous Round 6 attempt if exists
  pgm.dropTable('round6_votes', { ifExists: true });
  pgm.dropTable('round6_history', { ifExists: true });
  pgm.dropTable('round6_state', { ifExists: true });

  pgm.createTable('hearts_game_state', {
    id: { type: 'integer', primaryKey: true, default: 1 },
    current_cycle: { type: 'integer', notNull: true, default: 1 },
    status: { type: 'text', notNull: true, default: 'waiting' }, // waiting, acting, resolving, finished
    winner_id: { type: 'uuid', references: 'users' },
  });

  pgm.createTable('hearts_players', {
    user_id: { type: 'uuid', primaryKey: true, references: 'users' },
    teammate_id: { type: 'uuid', references: 'users' },
    hearts: { type: 'integer', notNull: true, default: 3 },
    is_alive: { type: 'boolean', notNull: true, default: true },
    current_action: { type: 'text' }, // PROTECT, BETRAY, SACRIFICE, QUIT, FINAL_SACRIFICE, REFUSE
    target_id: { type: 'uuid', references: 'users' },
  });

  // Initial state row
  pgm.sql('INSERT INTO hearts_game_state (id) VALUES (1)');
};

exports.down = (pgm) => {
  pgm.dropTable('hearts_players');
  pgm.dropTable('hearts_game_state');
};
