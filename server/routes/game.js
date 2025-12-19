const fp = require('fastify-plugin');
const db = require('../db');

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
          await db.query('UPDATE game_state SET status = \'waiting\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
        }

        if (data.type === 'finish_round' && currentUser.role === 'volunteer') {
          console.log('Finishing round...');
          await db.query('UPDATE game_state SET status = \'finished\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          broadcast({ type: 'round_finished', round: 1 });
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
