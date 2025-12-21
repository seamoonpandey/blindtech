exports.up = (pgm) => {
  pgm.addColumns('users', {
    has_used_safety: { type: 'boolean', default: false },
  });

  pgm.createTable('round6_state', {
    id: { type: 'id', primaryKey: true }, // usually just 1 row with id=1
    current_subround: { type: 'integer', default: 1 },
    subround_status: { type: 'text', default: 'waiting' }, // waiting, voting, result
    voting_started_at: { type: 'timestamp' },
    last_eliminated_id: { type: 'uuid' },  // Track who died last
    last_partner_eliminated_id: { type: 'uuid' } // Track collateral damage
  });
  // Initial row
  pgm.sql('INSERT INTO round6_state (id) VALUES (1)');

  pgm.createTable('round6_votes', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    round_number: { type: 'integer', notNull: true },
    voter_id: { type: 'uuid', references: 'users', notNull: true },
    target_id: { type: 'uuid', references: 'users', notNull: true }, // who they voted for
    used_safety: { type: 'boolean', default: false },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
  
  // Unique constraint: one vote per subround per user
  pgm.addConstraint('round6_votes', 'unique_voter_round', {
    unique: ['round_number', 'voter_id']
  });
};

exports.down = (pgm) => {
  pgm.dropTable('round6_votes');
  pgm.dropTable('round6_state');
  pgm.dropColumns('users', ['has_used_safety']);
};
