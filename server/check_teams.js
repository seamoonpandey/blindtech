const db = require('./db');

async function check() {
  try {
    const res = await db.query("SELECT round_formed, count(*) FROM teams GROUP BY round_formed");
    console.log('Teams summary:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
