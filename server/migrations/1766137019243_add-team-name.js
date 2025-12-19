exports.up = (pgm) => {
  pgm.addColumn('teams', {
    name: { type: 'varchar(255)', notNull: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('teams', 'name');
};
