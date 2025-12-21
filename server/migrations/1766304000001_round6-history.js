exports.up = (pgm) => {
  pgm.createTable('round6_history', {
    subround: { type: 'integer', primaryKey: true },
    target_id: { type: 'uuid', references: 'users' },
    partner_id: { type: 'uuid', references: 'users' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('round6_history');
};
