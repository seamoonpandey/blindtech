const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/blindtech' });

async function findCardIndex() {
  await client.connect();
  try {
    const res = await client.query("SELECT id, content FROM lottery_pool");
    const cards = res.rows;
    const player1Card = cards.find(c => c.content.type === 'player' && c.content.name === 'Player 1');
    const index = cards.findIndex(c => c.content.type === 'player' && c.content.name === 'Player 1');
    
    if (player1Card) {
      console.log(`Player 1 Card ID: ${player1Card.id}`);
      console.log(`Grid Index (0-based): ${index}`);
    } else {
      console.log('Player 1 card not found in pool.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  await client.end();
}

findCardIndex();
