exports.up = (pgm) => {
  pgm.addColumn('users', {
    is_eliminated: { type: 'boolean', default: false }
  });

  pgm.createTable('lottery_pool', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    content: { type: 'jsonb', notNull: true },
    is_taken: { type: 'boolean', default: false },
    taken_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' }
  });

  pgm.createTable('teams', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user1_id: { type: 'uuid', notNull: true, references: 'users' },
    user2_id: { type: 'uuid', notNull: true, references: 'users' },
    round_formed: { type: 'integer', notNull: true }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('teams');
  pgm.dropTable('lottery_pool');
  pgm.dropColumn('users', 'is_eliminated');
};
