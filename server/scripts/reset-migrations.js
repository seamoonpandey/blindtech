const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://localhost:5432/blindtech' });
client.connect();
client.query('DROP TABLE IF EXISTS pgmigrations', (err, res) => {
  console.log(err ? err : 'Dropped pgmigrations');
  client.end();
});
