exports.up = (pgm) => {
  pgm.addColumn('round5_games', {
    subround_started_at: { 
      type: 'timestamp', 
      default: pgm.func('current_timestamp') 
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('round5_games', 'subround_started_at');
};
