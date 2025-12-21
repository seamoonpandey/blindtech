exports.up = (pgm) => {
  // Drop PK constraint and add reason column
  pgm.dropConstraint('round6_history', 'round6_history_pkey');
  pgm.addColumns('round6_history', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    reason: { type: 'text', default: 'vote' } // 'vote' or 'timeout'
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('round6_history', ['id', 'reason']);
  pgm.addConstraint('round6_history', 'round6_history_pkey', { primaryKey: ['subround'] });
};
