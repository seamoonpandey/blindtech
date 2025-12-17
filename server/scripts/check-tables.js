const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres@localhost:5432/blindtech' });
client.connect();
client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", (err, res) => {
  console.log(res ? res.rows : err);
  client.end();
});
