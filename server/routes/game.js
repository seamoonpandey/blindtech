const fp = require('fastify-plugin');
const db = require('../db');

const HARD_QUOTES = [
  "The only way to win is to not play.",
  "Your silence is your best weapon.",
  "Trust is a luxury you can't afford.",
  "In the end, we all stand alone.",
  "The system has no mercy.",
  "Your contribution has been noted and discarded.",
  "Efficiency is the only virtue.",
  "The code is the law.",
  "You were a variable, now you are a constant: Zero.",
  "Connection terminated.",
  "Access denied permanently.",
  "Your existence is a syntax error.",
  "Null pointer exception in your soul.",
  "Garbage collection in progress.",
  "Process killed.",
  "Segmentation fault (core dumped).",
  "Unexpected end of input.",
  "Out of memory. Out of time.",
  "The cake is a lie.",
  "Goodbye, world."
];

async function gameRoutes(fastify, options) {
  const clients = new Map(); // userId -> socket

  // Helper to broadcast to all
  const broadcast = (data) => {
    const msg = JSON.stringify(data);
    for (const client of clients.values()) {
      if (client.readyState === 1) { // OPEN
        client.send(msg);
      }
    }
  };

  // Helper to calculate leaderboard
  const calculateLeaderboard = async () => {
    // Round 1 logic
    const submissionsRes = await db.query('SELECT * FROM submissions WHERE round = 1');
    const usersRes = await db.query('SELECT id, name FROM users WHERE role = \'player\'');
    
    const players = usersRes.rows;
    const submissions = submissionsRes.rows;
    
    const scores = {};
    players.forEach(p => scores[p.id] = 0);

    // B1 = 100, Bn = 10 (10% of B1)
    const B1 = 100;
    const Bn = 10;
    const M = 2; // Mutual Multiplier

    // Map of who selected whom: selectorId -> { targetId: rank }
    const selections = {};
    submissions.forEach(s => {
      selections[s.user_id] = {};
      s.payload.forEach(item => {
        selections[s.user_id][item.target_id] = item.rank;
      });
    });

    submissions.forEach(s => {
      const selectorId = s.user_id;
      s.payload.forEach(item => {
        const targetId = item.target_id;
        const rank = item.rank;
        const n = s.payload.length;
        
        // Linear scaling: score = B1 - (rank - 1) * (B1 - Bn) / (n - 1)
        // If n=1, score = B1
        let baseScore = B1;
        if (n > 1) {
          baseScore = B1 - (rank - 1) * (B1 - Bn) / (n - 1);
        }

        // Check for mutual
        const isMutual = selections[targetId] && selections[targetId][selectorId];
        
        if (isMutual) {
          scores[targetId] += baseScore * M;
        } else {
          scores[targetId] += baseScore;
        }
      });
    });

    const leaderboard = players.map(p => ({
      id: p.id,
      name: p.name,
      score: Math.round(scores[p.id] || 0)
    })).sort((a, b) => b.score - a.score);

    return leaderboard;
  };

  fastify.get('/ws', { websocket: true }, (socket, req) => {
    fastify.log.info('Client connected to WebSocket');
    let currentUser = null;

    socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WS message:', data.type, data);
        
        if (data.type === 'auth') {
          const { token } = data;
          const decoded = fastify.jwt.verify(token);
          currentUser = decoded;
          clients.set(currentUser.id, socket);
          
          // Send current state
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          const leaderboard = await calculateLeaderboard();
          const submissionRes = await db.query('SELECT payload FROM submissions WHERE user_id = $1 AND round = 1', [currentUser.id]);
          
          socket.send(JSON.stringify({ 
            type: 'init', 
            state: stateRes.rows[0],
            leaderboard,
            submission: submissionRes.rows[0]?.payload || null
          }));

          // If round 2 is active, send the pool
          if (stateRes.rows[0].current_round === 2) {
            const poolRes = await db.query('SELECT id, is_taken, taken_by FROM lottery_pool');
            socket.send(JSON.stringify({ type: 'lottery_pool', pool: poolRes.rows }));
            
            // Also send if user is leader or selector
            const inPoolRes = await db.query("SELECT id FROM lottery_pool WHERE content->>'type' = 'player' AND content->>'id' = $1", [currentUser.id]);
            const isLeader = inPoolRes.rows.length > 0;
            socket.send(JSON.stringify({ type: 'round2_role', role: isLeader ? 'leader' : 'selector' }));

            // Send selection result if already made or if leader is picked
            if (!isLeader) {
              const selectionRes = await db.query('SELECT content FROM lottery_pool WHERE taken_by = $1', [currentUser.id]);
              if (selectionRes.rows.length > 0) {
                const content = selectionRes.rows[0].content;
                let result = {};
                if (content.type === 'player') {
                  result = { type: 'team', partner: content.name };
                } else {
                  result = { type: 'eliminated', quote: content.text };
                }
                socket.send(JSON.stringify({ type: 'selection_result', result }));
              }
            } else {
              // Check if leader is picked
              const pickedRes = await db.query('SELECT u.name FROM lottery_pool lp JOIN users u ON lp.taken_by = u.id WHERE lp.content->>\'type\' = \'player\' AND lp.content->>\'id\' = $1 AND lp.is_taken = true', [currentUser.id]);
              if (pickedRes.rows.length > 0) {
                const result = { type: 'team', partner: pickedRes.rows[0].name };
                socket.send(JSON.stringify({ type: 'selection_result', result }));
              }
            }
          }
          return;
        }

        if (!currentUser) return;

        if (data.type === 'start_round' && currentUser.role === 'volunteer') {
          await db.query('UPDATE game_state SET current_round = 1, status = \'active\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
        }

        if (data.type === 'stop_round' && currentUser.role === 'volunteer') {
          console.log('Stopping round...');
          const stateResBefore = await db.query('SELECT current_round FROM game_state WHERE id = 1');
          const currentRound = stateResBefore.rows[0].current_round;

          if (currentRound === 2) {
            // Eliminate everyone not in a team
            console.log('Eliminating single players in Round 2...');
            const elimRes = await db.query(`
              UPDATE users 
              SET is_eliminated = true 
              WHERE role = 'player' 
              AND id NOT IN (
                SELECT user1_id FROM teams WHERE round_formed = 2
                UNION 
                SELECT user2_id FROM teams WHERE round_formed = 2
              )
            `);
            console.log('Eliminated', elimRes.rowCount, 'players');
            await db.query('UPDATE game_state SET status = \'finished\' WHERE id = 1');
          } else {
            console.log('Not in Round 2, setting status to waiting. Current round:', currentRound);
            await db.query('UPDATE game_state SET status = \'waiting\' WHERE id = 1');
          }

          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
        }

        if (data.type === 'finish_round' && currentUser.role === 'volunteer') {
          console.log('Finishing round...');
          await db.query('UPDATE game_state SET status = \'finished\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          broadcast({ type: 'round_finished', round: stateRes.rows[0].current_round });
        }

        if (data.type === 'start_round_2' && currentUser.role === 'volunteer') {
          console.log('Starting Round 2...');
          const leaderboard = await calculateLeaderboard();
          console.log('Leaderboard calculated, size:', leaderboard.length);
          const totalPlayers = leaderboard.length;
          const X = Math.min(10, Math.floor(totalPlayers / 2)); // Top X leaders
          console.log('X (leaders count):', X);
          
          const leaders = leaderboard.slice(0, X);
          const selectors = leaderboard.slice(X);
          console.log('Leaders:', leaders.length, 'Selectors:', selectors.length);
          
          // Clear old pool
          await db.query('DELETE FROM lottery_pool');
          console.log('Cleared lottery_pool');
          
          const poolItems = [];
          // Add leaders to pool
          leaders.forEach(l => {
            poolItems.push({ type: 'player', id: l.id, name: l.name });
          });
          // Add quotes to pool
          const numQuotes = selectors.length - leaders.length;
          console.log('Number of quotes to add:', numQuotes);
          for (let i = 0; i < numQuotes; i++) {
            const quote = HARD_QUOTES[i % HARD_QUOTES.length];
            poolItems.push({ type: 'quote', text: quote });
          }
          
          // Shuffle poolItems
          for (let i = poolItems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [poolItems[i], poolItems[j]] = [poolItems[j], poolItems[i]];
          }
          
          // Insert into DB
          console.log('Inserting', poolItems.length, 'items into lottery_pool...');
          for (const item of poolItems) {
            await db.query('INSERT INTO lottery_pool (content) VALUES ($1)', [JSON.stringify(item)]);
          }
          
          console.log('Updating game_state to round 2...');
          await db.query('UPDATE game_state SET current_round = 2, status = \'active\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          
          const poolRes = await db.query('SELECT id, is_taken, taken_by FROM lottery_pool');
          broadcast({ type: 'lottery_pool', pool: poolRes.rows });
          console.log('Round 2 started successfully');
        }

        if (data.type === 'select_card' && currentUser.role === 'player') {
          const { cardId } = data;
          
          const client = await db.pool.connect();
          try {
            await client.query('BEGIN');
            
            // Check if user is already eliminated or paired
            const userCheck = await client.query('SELECT is_eliminated FROM users WHERE id = $1', [currentUser.id]);
            const teamCheck = await client.query('SELECT id FROM teams WHERE user1_id = $1 OR user2_id = $1', [currentUser.id]);
            
            if (userCheck.rows[0].is_eliminated || teamCheck.rows.length > 0) {
              throw new Error('User already processed');
            }

            // Try to claim the card
            const res = await client.query(
              'UPDATE lottery_pool SET is_taken = true, taken_by = $1 WHERE id = $2 AND is_taken = false RETURNING content',
              [currentUser.id, cardId]
            );
            
            if (res.rows.length === 0) {
              throw new Error('Card already taken');
            }
            
            const content = res.rows[0].content;
            let result = {};
            
            if (content.type === 'player') {
              // Create team
              await client.query(
                'INSERT INTO teams (user1_id, user2_id, round_formed) VALUES ($1, $2, 2)',
                [currentUser.id, content.id]
              );
              result = { type: 'team', partner: content.name };
            } else {
              // Eliminate
              await client.query('UPDATE users SET is_eliminated = true WHERE id = $1', [currentUser.id]);
              result = { type: 'eliminated', quote: content.text };
            }
            
            await client.query('COMMIT');
            
            socket.send(JSON.stringify({ type: 'selection_result', result }));
            broadcast({ type: 'card_taken', cardId, taken_by: currentUser.id });

            // If it was a player card, notify the leader
            if (content.type === 'player') {
              const leaderSocket = clients.get(content.id);
              if (leaderSocket) {
                leaderSocket.send(JSON.stringify({ 
                  type: 'selection_result', 
                  result: { type: 'team', partner: currentUser.name } 
                }));
              }
            }
            
          } catch (e) {
            await client.query('ROLLBACK');
            socket.send(JSON.stringify({ type: 'error', message: e.message }));
          } finally {
            client.release();
          }
        }

        if (data.type === 'submit_ranking' && currentUser.role === 'player') {
          // payload: [{target_id, rank}, ...]
          await db.query(
            'INSERT INTO submissions (user_id, round, payload) VALUES ($1, 1, $2) ON CONFLICT (user_id, round) DO UPDATE SET payload = $2',
            [currentUser.id, JSON.stringify(data.payload)]
          );
          
          const leaderboard = await calculateLeaderboard();
          broadcast({ type: 'leaderboard_update', leaderboard });
        }

      } catch (e) {
        fastify.log.error(e);
      }
    });

    socket.on('close', () => {
      if (currentUser) clients.delete(currentUser.id);
    });
  });

  fastify.get('/me', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [request.user.id]);
    return result.rows[0];
  });

  fastify.get('/players', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const result = await db.query('SELECT id, name FROM users WHERE role = \'player\' AND id != $1', [request.user.id]);
    return result.rows;
  });
}

module.exports = fp(gameRoutes);
