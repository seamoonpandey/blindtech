const { Client } = require('pg');

// Prefer env DATABASE_URL so we inspect the same DB the server uses
const connectionString = process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech';
const client = new Client({ connectionString });

async function main() {
  await client.connect();
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
  const count = await client.query('SELECT COUNT(*) FROM users');
  const sample = await client.query('SELECT id, name, email, role, is_eliminated FROM users ORDER BY created_at DESC LIMIT 10');

  console.log('DB:', connectionString);
  console.log('Columns:', cols.rows);
  console.log('User count:', count.rows[0].count);
  console.log('Sample users:', sample.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  client.end();
});
