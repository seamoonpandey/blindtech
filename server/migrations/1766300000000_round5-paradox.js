exports.up = (pgm) => {
  // Main game state table for each 2v2 match
  pgm.createTable('round5_games', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    team_a_id: { type: 'uuid', references: 'teams(id)', notNull: true },
    team_b_id: { type: 'uuid', references: 'teams(id)', notNull: false }, // null = bye/auto-win
    volunteer_id: { type: 'uuid', references: 'users(id)', notNull: false },
    team_a_momentum: { type: 'integer', default: 7 },
    team_b_momentum: { type: 'integer', default: 7 },
    team_a_pact_used: { type: 'boolean', default: false },
    team_b_pact_used: { type: 'boolean', default: false },
    current_round: { type: 'integer', default: 1 }, // 1-6 (or 7 for sudden death)
    active_team: { type: 'varchar(1)', default: 'A' }, // 'A' or 'B'
    team_a_turn_order: { type: 'jsonb', notNull: true }, // [userId1, userId2]
    team_b_turn_order: { type: 'jsonb', notNull: false },
    status: { type: 'varchar(20)', default: 'waiting' }, // waiting, active, sudden_death, finished
    result: { type: 'varchar(20)', notNull: false }, // team_a_win, team_b_win, both_win, both_lose
    is_sudden_death: { type: 'boolean', default: false },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  }, { ifNotExists: true });

  // Individual turn tracking
  pgm.createTable('round5_turns', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    game_id: { type: 'uuid', references: 'round5_games(id)', notNull: true, onDelete: 'CASCADE' },
    round_number: { type: 'integer', notNull: true },
    player_id: { type: 'uuid', references: 'users(id)', notNull: true },
    team: { type: 'varchar(1)', notNull: true }, // 'A' or 'B'
    card_selected: { type: 'varchar(10)', notNull: true }, // ATTACK, FORTIFY, CONVERGE
    is_revealed: { type: 'boolean', default: false },
    pact_used: { type: 'varchar(50)', notNull: false }, // reduce_penalty, copy_opponent, ignore_negative
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('round5_turns', { ifExists: true });
  pgm.dropTable('round5_games', { ifExists: true });
};
