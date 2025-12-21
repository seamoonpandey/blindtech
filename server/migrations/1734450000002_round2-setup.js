exports.up = (pgm) => {
  pgm.addColumn('users', {
    is_eliminated: { type: 'boolean', default: false }
  }, { ifNotExists: true });

  pgm.createTable('lottery_pool', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    content: { type: 'jsonb', notNull: true },
    is_taken: { type: 'boolean', default: false },
    taken_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' }
  }, { ifNotExists: true });

  pgm.createTable('teams', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user1_id: { type: 'uuid', notNull: true, references: 'users' },
    user2_id: { type: 'uuid', notNull: true, references: 'users' },
    round_formed: { type: 'integer', notNull: true }
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('teams', { ifExists: true });
  pgm.dropTable('lottery_pool', { ifExists: true });
  pgm.dropColumn('users', 'is_eliminated', { ifExists: true });
};
