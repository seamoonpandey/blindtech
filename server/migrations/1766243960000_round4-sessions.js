exports.up = (pgm) => {
  pgm.createTable('round4_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    team_id: { type: 'uuid', references: 'teams(id)', notNull: true },
    volunteer_id: { type: 'uuid', references: 'users(id)', notNull: false },
    status: { type: 'varchar(20)', default: 'waiting' },
    result: { type: 'varchar(10)', notNull: false },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable('round4_sessions', { ifExists: true });
};
