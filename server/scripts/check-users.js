const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres@localhost:5432/blindtech' });
client.connect();
client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'", (err, res) => {
  console.log(res ? res.rows : err);
  client.end();
});
