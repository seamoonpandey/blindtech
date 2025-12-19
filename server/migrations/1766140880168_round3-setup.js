exports.up = (pgm) => {
  pgm.createTable('round3_matches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    team1_id: { type: 'uuid', references: 'teams(id)', notNull: false }, // nullable for byes or odd numbers
    team2_id: { type: 'uuid', references: 'teams(id)', notNull: false },
    volunteer_id: { type: 'uuid', references: 'users(id)', notNull: false },
    team1_scores: { type: 'jsonb', default: '[]' },
    team2_scores: { type: 'jsonb', default: '[]' },
    current_subround: { type: 'integer', default: 1 },
    status: { type: 'varchar(20)', default: 'waiting' }, // 'waiting', 'active', 'finished'
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('round3_matches');
};
