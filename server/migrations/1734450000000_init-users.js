exports.up = pgm => {
  pgm.createExtension('uuid-ossp', { ifNotExists: true });
  pgm.createTable('users', {
    id: { type: 'uuid', default: pgm.func('uuid_generate_v4()'), primaryKey: true },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    role: { type: 'text', notNull: true, check: "role IN ('player', 'volunteer')" },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  }, { ifNotExists: true });
};

exports.down = pgm => {
  pgm.dropTable('users', { ifExists: true });
  pgm.dropExtension('uuid-ossp', { ifExists: true });
};
