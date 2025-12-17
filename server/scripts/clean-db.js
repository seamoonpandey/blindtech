const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres@localhost:5432/blindtech' });

async function clean() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);
    
    for (const row of res.rows) {
      console.log(`Dropping table ${row.table_name}`);
      await client.query(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
    }
    console.log('All tables dropped');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

clean();
