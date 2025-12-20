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

const TEAM_NAMES = [
  "It Works On My Machine",
  "Blame The Compiler",
  "Semicolon Optional",
  "Oops All Side Effects",
  "Probably Deterministic",
  "The Accidental Globals",
  "Unreachable But Executed",
  "Ship It & Pray",
  "Undefined But Confident",
  "The Quantum TODO",
  "Works Until Demo",
  "The Misleading Benchmarks",
  "Hotfix In Production",
  "The Schrödinger Deploy",
  "Trust Me Bro It’s O(1)",
  "The Heuristic Vibes",
  "Just One More Flag",
  "Legacy By Tomorrow",
  "The Eventually Correct",
  "The Phantom Requirements",
  "Cargo Cult Engineers",
  "Temporary Permanent Fix",
  "The Parallel Universe Branch",
  "The Sleep-Deprived Commit",
  "Fast Enough Probably",
  "The Non Reproducibles",
  "The Dark Magic Constants",
  "Unoptimized Feelings",
  "Magic Number Enjoyers",
  "The Accidental Framework",
  "The Debugger Gaslighting",
  "Clearly A Feature",
  "The Half-Baked Abstractions",
  "Premature Optimization Club",
  "The Technical Debt Enjoyers",
  "Uncomment In Case Of Fire",
  "The Ill-Defined Interface",
  "Not A Bug If Unnoticed",
  "The Infinite Refactor",
  "Works As Intended Somehow",
  "The Conditional Chaos",
  "The Last Minute Merge",
  "Ship Now Think Later",
  "The Ghost Of Deprecated APIs",
  "The Runtime Vibes",
  "Benchmarked On My Laptop",
  "The Overfit Solution",
  "The Postmortem Pending",
  "The Config From Hell",
  "The Spooky Action At Runtime",
  "The Accidental Microservice",
  "The Hand-Wavy Spec",
  "The Panic-Driven Design",
  "The False Sense Of Security",
  "The Just Push It Crew",
  "The Heavily Coupled",
  "The Questionable Assumptions",
  "The One Weird Edge Case",
  "The Maybe Monads",
  "The Latent Disaster",
  "The Debug Print Survivors",
  "The Silent Data Corruption",
  "The Async Anxiety",
  "The Eventually Fired",
  "The Undefined Roadmap",
  "The Chaos-Driven Development",
  "The Blame Game Theory",
  "The Suspiciously Fast",
  "The Haunted Build Server",
  "The Deadline Optimized",
  "The Regex Summoners",
  "The Hope-Based Architecture",
  "The Accidental AI"
];

async function gameRoutes(fastify, options) {
  const clients = new Map(); // userId -> socket

  const broadcast = (data) => {
    const msg = JSON.stringify(data);
    for (const { socket } of clients.values()) {
      if (socket.readyState === 1) { // OPEN
        socket.send(msg);
      }
    }
  };

  const broadcastRound3Update = async () => {
    const matches = await getRound3Matches();
    for (const [userId, { socket, user }] of clients.entries()) {
      if (socket.readyState === 1) {
        if (user.role === 'volunteer') {
          socket.send(JSON.stringify({ type: 'round3_update', matches }));
        } else {
          const myMatch = matches.find(m => 
            m.team1_user1 === userId || m.team1_user2 === userId || 
            m.team2_user1 === userId || m.team2_user2 === userId
          );
          socket.send(JSON.stringify({ type: 'round3_update', matches: myMatch ? [myMatch] : [] }));
        }
      }
    }
  };

  async function getDetailedPool() {
    const res = await db.query(`
      SELECT 
        lp.id, 
        lp.is_taken, 
        lp.taken_by, 
        u.name as taken_by_name,
        CASE 
          WHEN (lp.content->>'type') = 'player' THEN (lp.content->>'name')
          ELSE 'QUOTE'
        END as content_name,
        t.name as team_name
      FROM lottery_pool lp
      LEFT JOIN users u ON lp.taken_by = u.id
      LEFT JOIN teams t ON (t.user1_id = lp.taken_by OR t.user2_id = lp.taken_by) AND t.round_formed = 2
    `);
    return res.rows;
  }

  async function getRound3Matches() {
    const res = await db.query(`
      SELECT 
        m.id, m.team1_id, m.team2_id, m.volunteer_id,
        m.team1_scores, m.team2_scores, m.current_subround, m.status,
        t1.name as team1_name, t2.name as team2_name,
        t1.user1_id as team1_user1, t1.user2_id as team1_user2,
        t2.user1_id as team2_user1, t2.user2_id as team2_user2,
        v.name as volunteer_name
      FROM round3_matches m
      LEFT JOIN teams t1 ON m.team1_id = t1.id
      LEFT JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN users v ON m.volunteer_id = v.id
    `);
    return res.rows;
  }

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
          // Store user info in clients map
          clients.set(currentUser.id, { socket, user: currentUser });
          
          // Send current state
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          const leaderboard = await calculateLeaderboard();
          const submissionRes = await db.query('SELECT payload FROM submissions WHERE user_id = $1 AND round = 1', [currentUser.id]);
          
          const userRes = await db.query('SELECT is_eliminated FROM users WHERE id = $1', [currentUser.id]);
          
          socket.send(JSON.stringify({ 
            type: 'init', 
            state: stateRes.rows[0],
            leaderboard,
            submission: submissionRes.rows[0]?.payload || null,
            isEliminated: userRes.rows[0]?.is_eliminated || false
          }));

          // If round 2 is active, send the pool
          if (stateRes.rows[0].current_round === 2) {
            if (currentUser.role === 'volunteer') {
              const pool = await getDetailedPool();
              socket.send(JSON.stringify({ type: 'lottery_pool', pool }));
            } else {
              const poolRes = await db.query('SELECT id, is_taken, taken_by FROM lottery_pool');
              socket.send(JSON.stringify({ type: 'lottery_pool', pool: poolRes.rows }));
            }
            
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
                  const teamRes = await db.query('SELECT name FROM teams WHERE (user1_id = $1 OR user2_id = $1) AND round_formed = 2', [currentUser.id]);
                  result = { type: 'team', partner: content.name, teamName: teamRes.rows[0]?.name };
                } else {
                  result = { type: 'eliminated', quote: content.text };
                }
                socket.send(JSON.stringify({ type: 'selection_result', result }));
              }
            } else {
              // Check if leader is picked
              const pickedRes = await db.query('SELECT u.id, u.name FROM lottery_pool lp JOIN users u ON lp.taken_by = u.id WHERE lp.content->>\'type\' = \'player\' AND lp.content->>\'id\' = $1 AND lp.is_taken = true', [currentUser.id]);
              if (pickedRes.rows.length > 0) {
                const teamRes = await db.query('SELECT name FROM teams WHERE (user1_id = $1 OR user2_id = $1) AND round_formed = 2', [currentUser.id]);
                const result = { type: 'team', partner: pickedRes.rows[0].name, teamName: teamRes.rows[0]?.name };
                socket.send(JSON.stringify({ type: 'selection_result', result }));
              }
            }
          }
          // If round 3 is active, send the match info
          if (stateRes.rows[0].current_round === 3) {
            if (currentUser.role === 'volunteer') {
              socket.send(JSON.stringify({ type: 'round3_init', matches: await getRound3Matches() }));
            } else {
              const matches = await getRound3Matches();
              const myMatch = matches.find(m => 
                m.team1_user1 === currentUser.id || m.team1_user2 === currentUser.id || 
                m.team2_user1 === currentUser.id || m.team2_user2 === currentUser.id
              );
              socket.send(JSON.stringify({ type: 'round3_init', matches: myMatch ? [myMatch] : [] }));
            }
          }
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
          } else {
            console.log('Stopping Round', currentRound);
          }

          await db.query('UPDATE game_state SET status = \'finished\' WHERE id = 1');
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
          
          const detailedPool = await getDetailedPool();
          const restrictedPool = detailedPool.map(c => ({ id: c.id, is_taken: c.is_taken, taken_by: c.taken_by }));
          broadcast({ type: 'lottery_pool', pool: restrictedPool });
          
          console.log('Round 2 started successfully');
        }

        if (data.type === 'start_round_3' && currentUser.role === 'volunteer') {
          console.log('Starting Round 3...');
          
          // Get all teams from Round 2
          const teamsRes = await db.query('SELECT * FROM teams WHERE round_formed = 2');
          let teams = teamsRes.rows;
          
          // Shuffle teams
          for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
          }
          
          // Clear old matches
          await db.query('DELETE FROM round3_matches');
          
          // Match teams
          for (let i = 0; i < teams.length; i += 2) {
            const team1 = teams[i];
            const team2 = teams[i + 1] || null; // Null if odd number of teams
            
            await db.query(
              'INSERT INTO round3_matches (team1_id, team2_id, status) VALUES ($1, $2, $3)',
              [team1.id, team2 ? team2.id : null, team2 ? 'waiting' : 'finished']
            );
            
            // If team2 is null, it's a "Bye" - team1 is automatically safe
            if (!team2) {
              // We'll mark them as safe later, for now they just wait or we can handle bye differently.
              // Actually, according to user's flow, it's better to match everyone or give a dummy.
              // For now, if odd, the last team just sits in a 'finished' bye match.
            }
          }

          await db.query('UPDATE game_state SET current_round = 3, status = \'active\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          
          await broadcastRound3Update();
          console.log('Round 3 started successfully');
        }

        if (data.type === 'join_match' && currentUser.role === 'volunteer') {
          const { matchId } = data;
          console.log(`Volunteer ${currentUser.name} joining match ${matchId}`);
          
          await db.query(
            'UPDATE round3_matches SET volunteer_id = $1, status = \'active\' WHERE id = $2 AND volunteer_id IS NULL',
            [currentUser.id, matchId]
          );
          
          await broadcastRound3Update();
        }

        if (data.type === 'score_team' && currentUser.role === 'volunteer') {
          const { matchId, teamIndex, score } = data; // teamIndex: 1 or 2, score: true/false
          console.log(`Volunteer scoring Match ${matchId}, Team ${teamIndex}: ${score}`);
          
          const matchRes = await db.query('SELECT * FROM round3_matches WHERE id = $1', [matchId]);
          const match = matchRes.rows[0];
          
          if (!match || match.volunteer_id !== currentUser.id) return;
          
          const teamScoresKey = teamIndex === 1 ? 'team1_scores' : 'team2_scores';
          const currentScores = match[teamScoresKey] || [];
          currentScores.push(score);
          
          await db.query(`UPDATE round3_matches SET ${teamScoresKey} = $1 WHERE id = $2`, [JSON.stringify(currentScores), matchId]);
          
          // Check if both teams scored for current subround
          const updatedMatchRes = await db.query('SELECT * FROM round3_matches WHERE id = $1', [matchId]);
          const updatedMatch = updatedMatchRes.rows[0];
          
          if (updatedMatch.team1_scores.length === updatedMatch.team2_scores.length) {
            if (updatedMatch.current_subround < 3) {
              await db.query('UPDATE round3_matches SET current_subround = current_subround + 1 WHERE id = $1', [matchId]);
            } else {
              // Finish match
              await db.query('UPDATE round3_matches SET status = \'finished\' WHERE id = $1', [matchId]);
              
              // Process elimination logic
              const processTeam = async (teamId, scores) => {
                if (!teamId) return;
                const positives = scores.filter(s => s === true).length;
                const safe = positives >= 2;
                if (!safe) {
                  // Mark users in team as eliminated
                  const teamUsersRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [teamId]);
                  const { user1_id, user2_id } = teamUsersRes.rows[0];
                  await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [user1_id, user2_id]);
                }
              };
              
              await processTeam(updatedMatch.team1_id, updatedMatch.team1_scores);
              await processTeam(updatedMatch.team2_id, updatedMatch.team2_scores);
            }
          }
          
          await broadcastRound3Update();
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
              // Get used team names
              const usedNamesRes = await client.query('SELECT name FROM teams WHERE name IS NOT NULL');
              const usedNames = usedNamesRes.rows.map(r => r.name);
              const availableNames = TEAM_NAMES.filter(n => !usedNames.includes(n));
              const teamName = availableNames.length > 0 
                ? availableNames[Math.floor(Math.random() * availableNames.length)]
                : `Team ${Math.floor(Math.random() * 1000)}`;

              // Create team
              await client.query(
                'INSERT INTO teams (user1_id, user2_id, round_formed, name) VALUES ($1, $2, 2, $3)',
                [currentUser.id, content.id, teamName]
              );
              result = { type: 'team', partner: content.name, teamName };
            } else {
              // Eliminate
              await client.query('UPDATE users SET is_eliminated = true WHERE id = $1', [currentUser.id]);
              result = { type: 'eliminated', quote: content.text };
            }
            
            await client.query('COMMIT');
            
            socket.send(JSON.stringify({ type: 'selection_result', result }));
            
            const detailedPool = await getDetailedPool();
            const restrictedPool = detailedPool.map(c => ({ id: c.id, is_taken: c.is_taken, taken_by: c.taken_by }));
            
            broadcast({ type: 'lottery_pool', pool: restrictedPool });
            
            // Send detailed to volunteers
            for (const [uid, s] of clients.entries()) {
              // We don't have roles in the clients map, but we can check if the socket is still open
              // For now, let's just rely on the fact that volunteers will see the restricted pool
              // and they can refresh or we can send a specific message.
              // Actually, I'll just send a 'volunteer_pool_update' message.
            }

            // If it was a player card, notify the leader
            if (content.type === 'player') {
              const leaderSocket = clients.get(content.id);
              if (leaderSocket) {
                leaderSocket.send(JSON.stringify({ 
                  type: 'selection_result', 
                  result: { type: 'team', partner: currentUser.name, teamName: result.teamName } 
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
