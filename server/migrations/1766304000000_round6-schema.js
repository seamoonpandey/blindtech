exports.up = (pgm) => {
  pgm.addColumns('users', {
    has_used_safety: { type: 'boolean', default: false },
  });

  pgm.createTable('round6_state', {
    id: { type: 'id', primaryKey: true },
    current_cycle: { type: 'integer', default: 1 },
    status: { type: 'text', default: 'waiting' }, // waiting, voting, result
    voting_started_at: { type: 'timestamp' },
    last_eliminated_id: { type: 'uuid' },
    last_partner_eliminated_id: { type: 'uuid' }
  });
  // Initial row
  pgm.sql('INSERT INTO round6_state (id) VALUES (1)');

  pgm.createTable('round6_votes', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    cycle: { type: 'integer', notNull: true },
    voter_id: { type: 'uuid', references: 'users', notNull: true },
    target_id: { type: 'uuid', references: 'users', notNull: true },
    used_safety: { type: 'boolean', default: false },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  
  // Unique constraint: one vote per cycle per user
  pgm.addConstraint('round6_votes', 'unique_voter_round', {
    unique: ['cycle', 'voter_id']
  });
};

exports.down = (pgm) => {
  pgm.dropTable('round6_votes');
  pgm.dropTable('round6_state');
  pgm.dropColumns('users', ['has_used_safety']);
};
