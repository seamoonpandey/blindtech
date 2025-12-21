exports.up = (pgm) => {
  pgm.addColumn('teams', {
    name: { type: 'varchar(255)', notNull: false },
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropColumn('teams', 'name', { ifExists: true });
};
