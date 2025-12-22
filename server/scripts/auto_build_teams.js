const db = require('../db');

async function autoBuildTeams() {
  try {
    console.log('🤖 Auto-Building Teams...');

    // 1. Verify Game State
    const stateRes = await db.query('SELECT current_round, status FROM game_state WHERE id = 1');
    const state = stateRes.rows[0];
    if (state.current_round !== 2) {
      console.error('❌ Error: Game is not in Round 2. Current Round:', state.current_round);
      process.exit(1);
    }
    if (state.status !== 'active') {
      console.error('❌ Error: Round 2 is not ACTIVE. Current Status:', state.status);
      process.exit(1);
    }

    // 2. Fetch Lottery Pool (Cards)
    const poolRes = await db.query("SELECT id, content, is_taken, taken_by FROM lottery_pool WHERE (content->>'type') != 'config'");
    const pool = poolRes.rows;
    console.log(`📋 Found ${pool.length} total cards in pool.`);

    // 3. Identify Leaders (Players inside the cards)
    const leaderIds = new Set();
    pool.forEach(card => {
      if (card.content.type === 'player') {
        leaderIds.add(card.content.id);
      }
    });
    console.log(`👑 Identified ${leaderIds.size} Leaders.`);

    // 4. Fetch All Players
    const playersRes = await db.query("SELECT id, name FROM users WHERE role = 'player'");
    const allPlayers = playersRes.rows;

    // 5. Identify Selectors (Players who are NOT leaders)
    // Also exclude players who have already picked a card
    const matchedSelectorIds = new Set(pool.filter(c => c.is_taken).map(c => c.taken_by));
    
    const unmatchedSelectors = allPlayers.filter(p => !leaderIds.has(p.id) && !matchedSelectorIds.has(p.id));
    console.log(`🎯 Found ${unmatchedSelectors.length} unmatched Selectors waiting to pick.`);

    // 6. Identify Available Cards
    const availableCards = pool.filter(c => !c.is_taken);
    console.log(`🃏 Found ${availableCards.length} available cards.`);

    if (unmatchedSelectors.length === 0) {
      console.log('✅ No unmatched selectors found. Everyone has picked!');
      process.exit(0);
    }

    // 7. Perform Matching (Randomly)
    // Shuffle selectors to simulate random picking order
    for (let i = unmatchedSelectors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unmatchedSelectors[i], unmatchedSelectors[j]] = [unmatchedSelectors[j], unmatchedSelectors[i]];
    }

    // Assign cards
    let picks = 0;
    for (const selector of unmatchedSelectors) {
      if (availableCards.length === 0) {
        console.warn('⚠️ No more cards available! Some selectors cannot pick.');
        break;
      }

      const card = availableCards.pop(); // Take a card
      await processPick(selector, card);
      picks++;
    }

    console.log(`✅ Successfully auto-picked for ${picks} selectors.`);
    console.log('🔄 Please REFRESH the admin panel to see the updated teams.');

  } catch (err) {
    console.error('❌ Script Failed:', err);
  } finally {
    process.exit();
  }
}

async function processPick(selector, card) {
  try {
    // 1. Mark Card as Taken
    await db.query('UPDATE lottery_pool SET is_taken = true, taken_by = $1 WHERE id = $2', [selector.id, card.id]);

    // 2. Handle Result
    if (card.content.type === 'player') {
      // It's a Leader! Create Team.
      const leaderId = card.content.id;
      // Fetch names for logging (optional, but nice)
      const teamName = `Team ${selector.name.split(' ')[1] || selector.name}-${card.content.name.split(' ')[1] || card.content.name}`;
      
      await db.query(`
        INSERT INTO teams (user1_id, user2_id, round_formed, name)
        VALUES ($1, $2, 2, $3)
      `, [leaderId, selector.id, teamName]);
      
      console.log(`   🤝 MATCH: ${selector.name} picked Leader ${card.content.name} -> Created Team`);
    } else {
      // It's a Quote! Eliminate Selector.
      await db.query(`
        UPDATE users SET is_eliminated = true WHERE id = $1
      `, [selector.id]);
      console.log(`   💀 ELIMINATED: ${selector.name} picked a Quote`);
    }

  } catch (e) {
    console.error(`   ❌ Failed to process pick for ${selector.name}:`, e);
  }
}

autoBuildTeams();
