const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres@localhost:5432/blindtech' });

async function listUsers() {
  try {
    await client.connect();
    // Get counts by role
    const counts = await client.query("SELECT role, COUNT(*) FROM users GROUP BY role");
    console.log("User Counts by Role:");
    console.table(counts.rows);

    const res = await client.query("SELECT id, name, email, role, is_eliminated FROM users ORDER BY role, name");
    console.log("All Users:");
    console.table(res.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

listUsers();
