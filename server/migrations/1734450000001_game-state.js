exports.up = pgm => {
  pgm.createTable('game_state', {
    id: { type: 'integer', primaryKey: true, default: 1 },
    current_round: { type: 'integer', notNull: true, default: 0 },
    status: { type: 'text', notNull: true, default: 'waiting' }, // waiting, active, finished
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.sql("INSERT INTO game_state (id, current_round, status) VALUES (1, 0, 'waiting')");

  pgm.createTable('submissions', {
    id: { type: 'uuid', default: pgm.func('uuid_generate_v4()'), primaryKey: true },
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    round: { type: 'integer', notNull: true },
    payload: { type: 'jsonb', notNull: true }, // e.g., [{target_id: '...', rank: 1}, ...]
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('submissions', 'unique_user_round', {
    unique: ['user_id', 'round']
  });
};

exports.down = pgm => {
  pgm.dropTable('submissions');
  pgm.dropTable('game_state');
};
