const fp = require('fastify-plugin');
const db = require('../db');
const heartsEngine = require('./heartsEngine');

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

  // BACKGROUND WORKER FOR ROUND 5 TIMERS
  setInterval(async () => {
    try {
      const activeGames = await db.query("SELECT id, status, current_round, subround_started_at FROM round5_games WHERE status = 'active'");
      for (const game of activeGames.rows) {
        const turnsRes = await db.query("SELECT id FROM round5_turns WHERE game_id = $1 AND round_number = $2 AND is_revealed = true", [game.id, game.current_round]);
        const revealed = turnsRes.rows.length > 0;
        
        const secondsElapsed = (Date.now() - new Date(game.subround_started_at).getTime()) / 1000;
        
        if (revealed && secondsElapsed >= 5) {
          console.log(`AUTO-ADVANCING ROUND 5 Game ${game.id} to Turn ${game.current_round + 1}`);
          await performR5NextRound(game.id);
        }
      }
    } catch (e) {
      console.error("Timer check error:", e);
    }
  }, 2000);

  // REST API for Disqualification (as requested for better visibility/reliability)
  fastify.post('/round3/disqualify', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { matchId, teamIndex } = request.body;
    const currentUser = request.user;

    if (currentUser.role !== 'volunteer') {
      return reply.code(403).send({ error: 'Only volunteers can disqualify teams' });
    }

    console.log(`API DISQUALIFY: Volunteer ${currentUser.name} -> Match ${matchId} Team ${teamIndex}`);

    try {
      const matchRes = await db.query('SELECT * FROM round3_matches WHERE id = $1', [matchId]);
      const match = matchRes.rows[0];
      
      if (!match) return reply.code(404).send({ error: 'Match not found' });
      const validStatuses = ['active', 'waiting'];
      if (!validStatuses.includes(match.status)) {
        return reply.code(400).send({ error: `Cannot disqualify team in a match with status: ${match.status}` });
      }

      const disqualifiedId = teamIndex === 1 ? match.team1_id : match.team2_id;
      const passingId = teamIndex === 1 ? match.team2_id : match.team1_id;

      // 1. Mark match as finished with extreme scores
      await db.query(`
        UPDATE round3_matches 
        SET status = 'finished', 
            team1_scores = $1, 
            team2_scores = $2 
        WHERE id = $3`,
        [
          JSON.stringify(teamIndex === 1 ? [false, false, false] : [true, true, true]),
          JSON.stringify(teamIndex === 2 ? [false, false, false] : [true, true, true]),
          matchId
        ]
      );

      // 2. Eliminate the disqualified team members
      const dqUsersRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [disqualifiedId]);
      if (dqUsersRes.rows[0]) {
        const { user1_id, user2_id } = dqUsersRes.rows[0];
        await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [user1_id, user2_id]);
      }

      // 3. Ensure passing team members are safe
      if (passingId) {
        const passUsersRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [passingId]);
        if (passUsersRes.rows[0]) {
          const { user1_id, user2_id } = passUsersRes.rows[0];
          await db.query('UPDATE users SET is_eliminated = false WHERE id IN ($1, $2)', [user1_id, user2_id]);
        }
      }

      // 4. Update UI via WebSocket broadcast
      await broadcastRound3Update();

      // 5. Explicit duel result notification
      const participants = [];
      if (dqUsersRes.rows[0]) participants.push(dqUsersRes.rows[0].user1_id, dqUsersRes.rows[0].user2_id);
      if (passingId) {
        const passUsersRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [passingId]);
        if (passUsersRes.rows[0]) participants.push(passUsersRes.rows[0].user1_id, passUsersRes.rows[0].user2_id);
      }

      for (const pid of participants) {
        const client = clients.get(pid);
        if (client && client.socket.readyState === 1) {
          const isDq = pid === dqUsersRes.rows[0]?.user1_id || pid === dqUsersRes.rows[0]?.user2_id;
          client.socket.send(JSON.stringify({ 
            type: 'duel_result', 
            matchId, 
            result: isDq ? 'disqualified' : 'won_by_dq'
          }));
        }
      }

      return reply.send({ success: true, matchId });
    } catch (err) {
      console.error('DQ API Error:', err);
      return reply.code(500).send({ error: 'Internal server error during disqualification' });
    }
  });

  const broadcast = (data) => {
    const msg = JSON.stringify(data);
    for (const { socket } of clients.values()) {
      if (socket.readyState === 1) { // OPEN
        socket.send(msg);
      }
    }
  };

  const broadcastRound3Update = async () => {
    console.log('Broadcasting Round 3 Update...');
    const matches = await getRound3Matches();
    let count = 0;
    for (const [userId, { socket, user }] of clients.entries()) {
      if (socket.readyState === 1) {
        count++;
        if (user.role === 'volunteer' || user.role === 'admin') {
          console.log(`Sending R3 update to ${user.role.toUpperCase()}: ${user.name}`);
          socket.send(JSON.stringify({ type: 'round3_update', matches }));
        } else {
          const myMatch = matches.find(m => 
            m.team1_user1 === userId || m.team1_user2 === userId || 
            m.team2_user1 === userId || m.team2_user2 === userId
          );
          if (myMatch) {
             console.log(`Sending R3 update to PLAYER: ${user.name} (Match ${myMatch.id})`);
             socket.send(JSON.stringify({ type: 'round3_update', matches: [myMatch] }));
          }
        }
      }
    }
    console.log(`Broadcasted to ${count} active clients.`);
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
        t.name as team_name,
        t.id as team_id
      FROM lottery_pool lp
      LEFT JOIN users u ON lp.taken_by = u.id
      LEFT JOIN teams t ON (t.user1_id = lp.taken_by OR t.user2_id = lp.taken_by) AND t.round_formed = 2
    `);
    return res.rows;
  }

  async function broadcastTeams() {
    const res = await db.query(`
      SELECT 
        t.id, t.name, t.round_formed,
        u1.name as user1_name, u2.name as user2_name,
        u1.id as user1_id, u2.id as user2_id,
        u1.is_eliminated as user1_eliminated, u2.is_eliminated as user2_eliminated
      FROM teams t
      JOIN users u1 ON t.user1_id = u1.id
      JOIN users u2 ON t.user2_id = u2.id
      ORDER BY t.id DESC
    `);
    const teams = res.rows;
    for (const [userId, { socket, user }] of clients.entries()) {
      if (socket.readyState === 1 && (user.role === 'admin' || user.role === 'volunteer')) {
        socket.send(JSON.stringify({ type: 'admin_teams', teams }));
      }
    }
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

  async function getRound4Sessions() {
    const res = await db.query(`
      SELECT 
        s.id, s.team_id, s.volunteer_id, s.status, s.result,
        t.name as team_name,
        t.user1_id, t.user2_id,
        u1.name as user1_name, u2.name as user2_name,
        v.name as volunteer_name
      FROM round4_sessions s
      JOIN teams t ON s.team_id = t.id
      JOIN users u1 ON t.user1_id = u1.id
      JOIN users u2 ON t.user2_id = u2.id
      LEFT JOIN users v ON s.volunteer_id = v.id
    `);
    return res.rows;
  }

  const broadcastRound4Update = async () => {
    console.log('Broadcasting Round 4 Update...');
    const sessions = await getRound4Sessions();
    let count = 0;
    for (const [userId, { socket, user }] of clients.entries()) {
      if (socket.readyState === 1) {
        count++;
        if (user.role === 'volunteer' || user.role === 'admin') {
          console.log(`Sending R4 update to ${user.role.toUpperCase()}: ${user.name}`);
          socket.send(JSON.stringify({ type: 'round4_update', sessions }));
        } else {
          const mySession = sessions.find(s => 
            s.user1_id === userId || s.user2_id === userId
          );
          if (mySession) {
            console.log(`Sending R4 update to PLAYER: ${user.name} (Session ${mySession.id})`);
            socket.send(JSON.stringify({ type: 'round4_update', sessions: [mySession] }));
          }
        }
      }
    }
    console.log(`Broadcasted R4 to ${count} active clients.`);
  };

async function getRound5Games() {
  const res = await db.query(`
    SELECT 
      g.id, g.team_a_id, g.team_b_id,
      g.team_a_momentum, g.team_b_momentum,
      g.team_a_pact_used, g.team_b_pact_used,
      g.current_round, g.active_team, g.status, g.result,
      g.team_a_turn_order, g.team_b_turn_order, g.is_sudden_death,
      g.subround_started_at,
      ta.name as team_a_name, tb.name as team_b_name,
      ta.user1_id as team_a_user1, ta.user2_id as team_a_user2,
      tb.user1_id as team_b_user1, tb.user2_id as team_b_user2
    FROM round5_games g
    JOIN teams ta ON g.team_a_id = ta.id
    LEFT JOIN teams tb ON g.team_b_id = tb.id
  `);
  
  // Fetch turns for each game
  for (const game of res.rows) {
    const turnsRes = await db.query(`
      SELECT round_number, player_id, team, card_selected, is_revealed, pact_used
      FROM round5_turns
      WHERE game_id = $1
      ORDER BY created_at ASC
    `, [game.id]);
    game.turns = turnsRes.rows;
  }
  
  return res.rows;
}

const broadcastRound5Update = async () => {
  console.log('Broadcasting Round 5 Update...');
  const games = await getRound5Games();
  let count = 0;
  for (const [userId, { socket, user }] of clients.entries()) {
    if (socket.readyState === 1) {
      count++;
      if (user.role === 'volunteer' || user.role === 'admin') {
        socket.send(JSON.stringify({ type: 'round5_update', games }));
      } else {
        const myGame = games.find(g => 
          g.team_a_user1 === userId || g.team_a_user2 === userId || 
          g.team_b_user1 === userId || g.team_b_user2 === userId
        );
        if (myGame) {
          socket.send(JSON.stringify({ type: 'round5_update', games: [myGame] }));
        }
      }
    }
  }
  console.log(`Broadcasted R5 to ${count} active clients.`);
};

function calculateMomentumChange(cardA, cardB) {
  // Momentum matrix: [Team A change, Team B change]
  // More balanced for a 10-round game
  const matrix = {
    ATTACK: {
      ATTACK: [-1, -1],
      FORTIFY: [2, -1],
      CONVERGE: [-2, 2]
    },
    FORTIFY: {
      ATTACK: [-1, 2],
      FORTIFY: [0, 0],
      CONVERGE: [1, -1]
    },
    CONVERGE: {
      ATTACK: [2, -2],
      FORTIFY: [-1, 1],
      CONVERGE: [3, 3]
    }
  };
  return matrix[cardA][cardB];
}

function checkGameEnd(momentumA, momentumB, currentRound) {
  // Instant Death at Zero
  if (momentumA <= 0 && momentumB <= 0) return { ended: true, result: 'both_lose' };
  if (momentumA <= 0) return { ended: true, result: 'team_b_win' };
  if (momentumB <= 0) return { ended: true, result: 'team_a_win' };

  // Paradox goes for 9 sub-rounds (alternating turns)
  if (currentRound < 9) {
    return { ended: false };
  }

  // Final Resolution at Round 9
  if (momentumA > momentumB) {
    return { ended: true, result: 'team_a_win' };
  } else if (momentumB > momentumA) {
    return { ended: true, result: 'team_b_win' };
  } else {
    // Tie at the end? Both teams proved their worth.
    return { ended: true, result: 'both_win' };
  }
}

// ROUND 6 HELPERS (THE GAME OF HEARTS)
async function getRound6State() {
  console.log('Fetching Round 6 State...');
  const stateRes = await db.query('SELECT * FROM hearts_game_state WHERE id = 1');
  if (!stateRes.rows[0]) return null;
  const state = stateRes.rows[0];

  // Attach players
  const playersRes = await db.query(`
    SELECT hp.*, u.name 
    FROM hearts_players hp
    JOIN users u ON hp.user_id = u.id
    ORDER BY u.name ASC
  `);
  state.players = playersRes.rows;

  return state;
}

const broadcastRound6Update = async () => {
  const r6State = await getRound6State();
  if (!r6State) return;

  console.log('Broadcasting Round 6 Update...');
  broadcast({ type: 'round6_update', state: r6State });
}

const performR5Resolution = async (gameId, isTimeout = false) => {
  const gameRes = await db.query('SELECT * FROM round5_games WHERE id = $1', [gameId]);
  const game = gameRes.rows[0];
  if (!game || game.status !== 'active') return;

  const turnsRes = await db.query(`
    SELECT * FROM round5_turns WHERE game_id = $1 AND round_number = $2
  `, [gameId, game.current_round]);

  // If missing turns, handle differently based on timeout
  const teams = ['A', 'B'];
  let teamEliminated = null;

  for (const t of teams) {
    const existing = turnsRes.rows.find(tr => tr.team === t);
    if (!existing) {
       console.log(`Missing turn for Team ${t} in Game ${gameId} Sub-round ${game.current_round}`);
       
       if (isTimeout) {
         teamEliminated = t;
         // We can stop checking if we found a missing one, we'll DQ this team.
         // If both are missing, we might DQ both or just A (handled below)
       }

       let player;
       const order = t === 'A' ? game.team_a_turn_order : game.team_b_turn_order;
       if (!order) {
          const gFull = (await db.query(`SELECT ta.user1_id as a1, tb.user1_id as b1 FROM round5_games g JOIN teams ta ON g.team_a_id = ta.id LEFT JOIN teams tb ON g.team_b_id = tb.id WHERE g.id = $1`, [gameId])).rows[0];
          player = t === 'A' ? gFull.a1 : gFull.b1;
       } else {
          player = order[(game.current_round - 1) % 2];
       }
       // On timeout, we still insert a dummy turn to satisfy the matrix logic below, 
       // but we will override the game result to DQ them.
       await db.query(`INSERT INTO round5_turns (game_id, round_number, player_id, team, card_selected, is_revealed) VALUES ($1, $2, $3, $4, 'FORTIFY', false)`, [gameId, game.current_round, player, t]);
    }
  }

  // Reload turns after potential inserts
  const finalTurns = await db.query(`SELECT * FROM round5_turns WHERE game_id = $1 AND round_number = $2`, [gameId, game.current_round]);
  const turnA = finalTurns.rows.find(t => t.team === 'A');
  const turnB = finalTurns.rows.find(t => t.team === 'B');
  
  const bothUsedPact = turnA.pact_used && turnB.pact_used;
  let [deltaA, deltaB] = calculateMomentumChange(turnA.card_selected, turnB.card_selected);
  
  if (!bothUsedPact) {
    if (turnA.pact_used === 'reduce_penalty' && deltaA <= -2) deltaA = -1;
    if (turnA.pact_used === 'ignore_negative' && deltaA < 0) deltaA = 0;
    if (turnB.pact_used === 'reduce_penalty' && deltaB <= -2) deltaB = -1;
    if (turnB.pact_used === 'ignore_negative' && deltaB < 0) deltaB = 0;
  }

  const newMomentumA = game.team_a_momentum + deltaA;
  const newMomentumB = game.team_b_momentum + deltaB;

  await db.query('UPDATE round5_turns SET is_revealed = true WHERE game_id = $1 AND round_number = $2', [gameId, game.current_round]);
  await db.query('UPDATE round5_games SET team_a_momentum = $1, team_b_momentum = $2 WHERE id = $3', [newMomentumA, newMomentumB, gameId]);
  
  let endCheck = checkGameEnd(newMomentumA, newMomentumB, game.current_round);
  
  // Override for timeout elimination
  if (teamEliminated) {
     const result = teamEliminated === 'A' ? 'team_b_win' : 'team_a_win';
     endCheck = { ended: true, result };
     console.log(`TIMEOUT ELIMINATION: Team ${teamEliminated} eliminated. Result: ${result}`);
  }

  if (endCheck.ended) {
    console.log(`GAME OVER for Game ${gameId}: ${endCheck.result}`);
    await db.query('UPDATE round5_games SET status = \'finished\', result = $1 WHERE id = $2', [endCheck.result, gameId]);
    const fullGame = (await db.query(`
      SELECT g.*, ta.user1_id as a1, ta.user2_id as a2, tb.user1_id as b1, tb.user2_id as b2
      FROM round5_games g JOIN teams ta ON g.team_a_id = ta.id LEFT JOIN teams tb ON g.team_b_id = tb.id
      WHERE g.id = $1
    `, [gameId])).rows[0];
    
    if (endCheck.result === 'team_a_win') {
      await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [fullGame.b1, fullGame.b2]);
    } else if (endCheck.result === 'team_b_win') {
      await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [fullGame.a1, fullGame.a2]);
    } else if (endCheck.result === 'both_lose') {
      await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2, $3, $4)', [fullGame.a1, fullGame.a2, fullGame.b1, fullGame.b2]);
    }
  }
  await broadcastRound5Update();
};

const performR5NextRound = async (gameId) => {
  const gameRes = await db.query('SELECT * FROM round5_games WHERE id = $1', [gameId]);
  const game = gameRes.rows[0];
  if (!game || game.status !== 'active') return;

  const nextRound = game.current_round + 1;
  const nextActiveTeam = game.active_team === 'A' ? 'B' : 'A';
  await db.query('UPDATE round5_games SET current_round = $1, active_team = $2, subround_started_at = CURRENT_TIMESTAMP WHERE id = $3', [nextRound, nextActiveTeam, gameId]);
  await broadcastRound5Update();
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
    })).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });

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
          
          // Admin doesn't need submission or elimination status from DB
          let submission = null;
          let isEliminated = false;
          
          if (currentUser.id !== 'admin-id') {
            const submissionRes = await db.query('SELECT payload FROM submissions WHERE user_id = $1 AND round = 1', [currentUser.id]);
            const userRes = await db.query('SELECT is_eliminated FROM users WHERE id = $1', [currentUser.id]);
            submission = submissionRes.rows[0]?.payload || null;
            isEliminated = userRes.rows[0]?.is_eliminated || false;
          }
          
          const r6State = stateRes.rows[0].current_round >= 6 ? await getRound6State() : null;

          socket.send(JSON.stringify({ 
            type: 'init', 
            state: stateRes.rows[0],
            leaderboard,
            submission,
            isEliminated,
            round6_state: r6State
          }));

          // If volunteer or admin, send additional data
          if (currentUser.role === 'volunteer' || currentUser.role === 'admin') {
            const lotteryRes = await db.query('SELECT * FROM lottery_pool ORDER BY id');
            socket.send(JSON.stringify({ type: 'lottery_pool', pool: lotteryRes.rows }));
            
            const r3Res = await db.query('SELECT * FROM round3_matches ORDER BY id');
            socket.send(JSON.stringify({ type: 'round3_matches', matches: r3Res.rows }));
            
            const r4Res = await db.query('SELECT * FROM round4_sessions ORDER BY id');
            socket.send(JSON.stringify({ type: 'round4_sessions', sessions: r4Res.rows }));
            
            const r5Res = await db.query('SELECT * FROM round5_games ORDER BY id');
            socket.send(JSON.stringify({ type: 'round5_games', games: r5Res.rows }));

            // Teams list for management
            const teamsRes = await db.query(`
              SELECT 
                t.id, t.name, t.round_formed,
                u1.name as user1_name, u2.name as user2_name,
                u1.id as user1_id, u2.id as user2_id,
                u1.is_eliminated as user1_eliminated, u2.is_eliminated as user2_eliminated
              FROM teams t
              JOIN users u1 ON t.user1_id = u1.id
              JOIN users u2 ON t.user2_id = u2.id
              ORDER BY t.id DESC
            `);
            socket.send(JSON.stringify({ type: 'admin_teams', teams: teamsRes.rows }));
          }

          // If admin, send all users for management
          if (currentUser.role === 'admin') {
            const allUsersRes = await db.query('SELECT id, name, email, role, is_eliminated FROM users ORDER BY name');
            socket.send(JSON.stringify({ type: 'admin_users', users: allUsersRes.rows }));
          }
          // If round 2 is active, send the pool
          if (stateRes.rows[0].current_round === 2) {
            if (currentUser.role === 'volunteer') {
              const pool = await getDetailedPool();
              socket.send(JSON.stringify({ type: 'lottery_pool', pool }));
            } else {
              const poolRes = await db.query('SELECT id, is_taken, taken_by FROM lottery_pool');
              socket.send(JSON.stringify({ type: 'lottery_pool', pool: poolRes.rows }));
            }
            
            // Common data for everyone
            const configRes = await db.query("SELECT content->>'leadersCount' as count FROM lottery_pool WHERE content->>'type' = 'config'");
            const leadersCountAttr = configRes.rows.length > 0 ? parseInt(configRes.rows[0].count) : null;

            if (currentUser.role === 'player') {
              let isLeader = false;
              if (leadersCountAttr !== null) {
                const lb = await calculateLeaderboard();
                const userIdx = lb.findIndex(p => p.id === currentUser.id);
                console.log(`[DEBUG] Role check for ${currentUser.name}: Rank ${userIdx + 1}, leadersCount ${leadersCountAttr}`);
                if (userIdx !== -1 && userIdx < leadersCountAttr) {
                  isLeader = true;
                }
              } else {
                // Fallback/Legacy: Check if user is in pool as content
                const inPoolRes = await db.query("SELECT id FROM lottery_pool WHERE content->>'type' = 'player' AND content->>'id' = $1", [currentUser.id]);
                isLeader = inPoolRes.rows.length > 0;
              }
              console.log(`[DEBUG] Assigining role ${isLeader ? 'leader' : 'selector'} to ${currentUser.name}`);
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
            } else {
              // Admin/Volunteer
              socket.send(JSON.stringify({ type: 'round2_role', role: 'admin' }));
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
          // If round 4 is active, send the session info
          if (stateRes.rows[0].current_round === 4) {
            if (currentUser.role === 'volunteer') {
              socket.send(JSON.stringify({ type: 'round4_init', sessions: await getRound4Sessions() }));
            } else {
              const sessions = await getRound4Sessions();
              const mySession = sessions.find(s => 
                s.user1_id === currentUser.id || s.user2_id === currentUser.id
              );
              socket.send(JSON.stringify({ type: 'round4_init', sessions: mySession ? [mySession] : [] }));
            }
          }
          // If round 5 is active, send the game info
          if (stateRes.rows[0].current_round === 5) {
            if (currentUser.role === 'volunteer') {
              socket.send(JSON.stringify({ type: 'round5_init', games: await getRound5Games() }));
            } else {
              const games = await getRound5Games();
              const myGame = games.find(g => 
                g.team_a_user1 === currentUser.id || g.team_a_user2 === currentUser.id || 
                g.team_b_user1 === currentUser.id || g.team_b_user2 === currentUser.id
              );
              socket.send(JSON.stringify({ type: 'round5_init', games: myGame ? [myGame] : [] }));
            }
          }
        }

        if (!currentUser && data.type !== 'auth') {
          console.log('WS: Unauthenticated message:', data.type);
          return;
        }
        
        console.log(`WS: Received ${data.type} from ${currentUser?.name || 'unknown'}`);

        if (data.type === 'start_round' && currentUser.role === 'admin') {
          await db.query('UPDATE game_state SET current_round = 1, status = \'active\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
        }

        if (data.type === 'stop_round' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Stopping round...', currentUser.role);
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
          }

          await db.query("UPDATE game_state SET status = 'finished' WHERE id = 1");
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
        }

        if (data.type === 'finish_round' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Finishing round...', currentUser.role);
          const stateResBefore = await db.query('SELECT current_round FROM game_state WHERE id = 1');
          const currentRound = stateResBefore.rows[0].current_round;

          if (currentRound === 2) {
            console.log('Eliminating single players in Round 2 (via finish_round)...');
            await db.query(`
              UPDATE users 
              SET is_eliminated = true 
              WHERE role = 'player' 
              AND id NOT IN (
                SELECT user1_id FROM teams WHERE round_formed = 2
                UNION 
                SELECT user2_id FROM teams WHERE round_formed = 2
              )
            `);
          }

          await db.query('UPDATE game_state SET status = \'finished\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          broadcast({ type: 'round_finished', round: stateRes.rows[0].current_round });
        }

        if (data.type === 'start_round_2' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Starting Round 2...');
          const leaderboard = await calculateLeaderboard();
          console.log('Leaderboard calculated, size:', leaderboard.length);
          const totalPlayers = leaderboard.length;
          // Use admin-specified count or default to top X
          let X = data.leadersCount !== undefined ? parseInt(data.leadersCount) : Math.min(10, Math.floor(totalPlayers / 2));
          X = Math.max(0, Math.min(X, totalPlayers)); // Guard rails
          console.log('X (leaders count):', X);
          
          const leaders = leaderboard.slice(0, X);
          const selectors = leaderboard.slice(X);
          console.log('Leaders:', leaders.length, 'Selectors:', selectors.length);
          
          // Clear old pool
          await db.query('DELETE FROM lottery_pool');
          console.log('Cleared lottery_pool');
          
          // Store config for role determination
          console.log(`[DEBUG] Storing leadersCount ${X} in lottery_pool config`);
          await db.query("INSERT INTO lottery_pool (content, is_taken) VALUES ($1, true)", [JSON.stringify({ type: 'config', leadersCount: X })]);
          
          const poolItems = [];
          // If we have more leaders than selectors, we only add selectors.length leaders to the pool
          // to ensure everyone who picks gets a partner.
          const effectiveLeaders = leaders.slice(0, Math.min(leaders.length, selectors.length));
          
          effectiveLeaders.forEach(l => {
            poolItems.push({ type: 'player', id: l.id, name: l.name });
          });

          // Add quotes to pool to fill it up to selectors.length
          const numQuotes = Math.max(0, selectors.length - poolItems.length);
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

          // Notify individual roles immediately
          for (const [uid, client] of clients.entries()) {
            if (client.user.role === 'player') {
              const userIdx = leaderboard.findIndex(p => p.id === client.user.id);
              const role = (userIdx !== -1 && userIdx < X) ? 'leader' : 'selector';
              if (client.socket.readyState === 1) {
                client.socket.send(JSON.stringify({ type: 'round2_role', role }));
              }
            }
          }
          
          console.log('Round 2 started successfully');
        }

        if (data.type === 'start_round_3' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          try {
            console.log('Starting Round 3...');
            
            // Get all teams from Round 2
            const teamsRes = await db.query('SELECT * FROM teams WHERE round_formed = 2');
            let teams = teamsRes.rows;
            console.log(`Found ${teams.length} teams for Round 3`);
            
            if (teams.length === 0) {
              socket.send(JSON.stringify({ type: 'error', message: 'No teams found. Round 2 must be completed first.' }));
              return;
            }
            
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
              const team2 = teams[i + 1] || null; 
              const isBye = !team2;
              
              const scores1 = isBye ? '[true,true,true]' : '[]';
              const scores2 = '[]';
              
              await db.query(
                'INSERT INTO round3_matches (team1_id, team2_id, status, team1_scores, team2_scores) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)',
                [
                  team1.id, 
                  team2 ? team2.id : null, 
                  isBye ? 'finished' : 'waiting', 
                  scores1,
                  scores2
                ]
              );
              
              if (isBye) console.log(`Team ${team1.name} got a BYE.`);
            }

            await db.query('UPDATE game_state SET current_round = 3, status = \'active\' WHERE id = 1');
            const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
            
            broadcast({ type: 'state_update', state: stateRes.rows[0] });
            await broadcastRound3Update();
            console.log('Round 3 started successfully');
          } catch (err) {
            console.error('CRITICAL ERROR starting Round 3:', err);
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to start Round 3: ' + err.message }));
          }
        }

        if (data.type === 'finish_round_3' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Finishing Round 3...');
          
          // Set game state to waiting (Round 3 finished, waiting for Round 4)
          await db.query("UPDATE game_state SET status = 'waiting' WHERE id = 1");
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          console.log('Round 3 finished - players can now see their elimination status');
        }

        if (data.type === 'start_round_4' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Starting Round 4 (Coding Club)...');
          
          // Get all surviving teams (users who are not eliminated and are in teams)
          const teamsRes = await db.query(`
            SELECT DISTINCT t.* 
            FROM teams t
            JOIN users u1 ON t.user1_id = u1.id
            JOIN users u2 ON t.user2_id = u2.id
            WHERE t.round_formed = 2 
            AND u1.is_eliminated = false 
            AND u2.is_eliminated = false
          `);
          
          const teams = teamsRes.rows;
          console.log(`Found ${teams.length} surviving teams for Round 4`);
          
          // Clear old sessions
          await db.query('DELETE FROM round4_sessions');
          
          // Create session for each team
          for (const team of teams) {
            await db.query(
              'INSERT INTO round4_sessions (team_id, status) VALUES ($1, $2)',
              [team.id, 'waiting']
            );
            console.log(`Created session for team: ${team.name}`);
          }
          
          await db.query('UPDATE game_state SET current_round = 4, status = \'active\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          await broadcastRound4Update();
          console.log('Round 4 started successfully');
        }

        if (data.type === 'volunteer_session' && currentUser.role === 'volunteer') {
          const { sessionId } = data;
          console.log(`Volunteer ${currentUser.name} joining session ${sessionId}`);
          
          await db.query(
            'UPDATE round4_sessions SET volunteer_id = $1, status = \'active\' WHERE id = $2 AND volunteer_id IS NULL',
            [currentUser.id, sessionId]
          );
          
          await broadcastRound4Update();
        }

        if (data.type === 'evaluate_team' && currentUser.role === 'volunteer') {
          const { sessionId, result } = data; // result: 'pass' or 'fail'
          console.log(`Volunteer ${currentUser.name} evaluating session ${sessionId}: ${result}`);
          
          const sessionRes = await db.query('SELECT * FROM round4_sessions WHERE id = $1', [sessionId]);
          const session = sessionRes.rows[0];
          
          if (!session || session.volunteer_id !== currentUser.id) {
            console.log('Unauthorized evaluation attempt');
            return;
          }
          
          // Update session
          await db.query(
            'UPDATE round4_sessions SET status = \'finished\', result = $1 WHERE id = $2',
            [result, sessionId]
          );
          
          // Get team members
          const teamRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [session.team_id]);
          const { user1_id, user2_id } = teamRes.rows[0];
          
          if (result === 'fail') {
            // Eliminate both team members
            await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [user1_id, user2_id]);
            console.log(`Team failed - both members eliminated`);
          } else {
            // Ensure both remain safe
            await db.query('UPDATE users SET is_eliminated = false WHERE id IN ($1, $2)', [user1_id, user2_id]);
            console.log(`Team passed - both members advance`);
          }
          
          await broadcastRound4Update();
        }

        if (data.type === 'finish_round_4' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Finishing Round 4...');
          await db.query("UPDATE game_state SET status = 'waiting' WHERE id = 1");
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
        }

        if (data.type === 'start_round_5' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Starting Round 5 (Paradox)...');
          
          // Get all surviving teams
          const teamsRes = await db.query(`
            SELECT DISTINCT t.* 
            FROM teams t
            JOIN users u1 ON t.user1_id = u1.id
            JOIN users u2 ON t.user2_id = u2.id
            WHERE t.round_formed = 2 
            AND u1.is_eliminated = false 
            AND u2.is_eliminated = false
          `);
          
          const teams = teamsRes.rows;
          console.log(`Found ${teams.length} surviving teams for Round 5`);
          
          // Shuffle teams
          for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
          }
          
          // Clear old games
          await db.query('DELETE FROM round5_games');
          
          // Create games (pair teams)
          for (let i = 0; i < teams.length; i += 2) {
            const teamA = teams[i];
            const teamB = teams[i + 1] || null;
            
            // Randomize turn order within each team
            const teamATurnOrder = Math.random() > 0.5 
              ? [teamA.user1_id, teamA.user2_id] 
              : [teamA.user2_id, teamA.user1_id];
            
            const teamBTurnOrder = teamB 
              ? (Math.random() > 0.5 
                ? [teamB.user1_id, teamB.user2_id] 
                : [teamB.user2_id, teamB.user1_id])
              : null;
            
            const isBye = !teamB;
            
            await db.query(`
              INSERT INTO round5_games (
                team_a_id, team_b_id, team_a_turn_order, team_b_turn_order,
                status, result, team_a_momentum, team_b_momentum, subround_started_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            `, [
              teamA.id, 
              teamB ? teamB.id : null,
              JSON.stringify(teamATurnOrder),
              teamBTurnOrder ? JSON.stringify(teamBTurnOrder) : null,
              isBye ? 'finished' : 'active',
              isBye ? 'team_a_win' : null,
              15, // Initial Momentum increased to 15
              15
            ]);
            
            if (isBye) {
              console.log(`Team ${teamA.name} got a BYE and auto-wins`);
            } else {
              console.log(`Created game: ${teamA.name} vs ${teamB.name}`);
            }
          }
          
          await db.query('UPDATE game_state SET current_round = 5, status = \'active\' WHERE id = 1');
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          await broadcastRound5Update();
          console.log('Round 5 started successfully');
        }

        if (data.type === 'r5_select_card') {
          const { gameId, card, pact } = data;
          const gameRes = await db.query(`
            SELECT g.*, 
                   ta.user1_id as team_a_user1, ta.user2_id as team_a_user2,
                   tb.user1_id as team_b_user1, tb.user2_id as team_b_user2
            FROM round5_games g
            JOIN teams ta ON g.team_a_id = ta.id
            LEFT JOIN teams tb ON g.team_b_id = tb.id
            WHERE g.id = $1
          `, [gameId]);
          const game = gameRes.rows[0];
          
          if (!game || game.status !== 'active') return;

          // Current turn in Round 5 is 1-9. 
          // If sub-round 1, any player from the team can play. 
          // The first person to play in sub-round 1 determines the order (0, 1, 0, 1...)
          const isTeamA = game.team_a_user1 === currentUser.id || game.team_a_user2 === currentUser.id;
          const myTeam = isTeamA ? 'A' : 'B';
          const teamPactUsed = isTeamA ? game.team_a_pact_used : game.team_b_pact_used;
          
          let turnOrder = isTeamA ? game.team_a_turn_order : game.team_b_turn_order;
          let currentPlayerId;

          if (game.current_round === 1) {
            // Anyone on the team can play the first round
            currentPlayerId = currentUser.id;
          } else {
            // Alternate based on the order established in Round 1
            const currentPlayerIndex = (game.current_round - 1) % 2;
            currentPlayerId = turnOrder[currentPlayerIndex];
          }

          if (currentPlayerId !== currentUser.id) {
            console.log(`Unauthorized turn attempt by ${currentUser.name}. Expected ${currentPlayerId}`);
            return;
          }

          const existingTurnRes = await db.query(`
            SELECT id FROM round5_turns WHERE game_id = $1 AND round_number = $2 AND player_id = $3
          `, [gameId, game.current_round, currentUser.id]);

          if (existingTurnRes.rows.length === 0) {
            let finalCard = card;
            let pactToUse = null;

            if (pact && !teamPactUsed) {
              pactToUse = pact;
              // If copy_opponent, we need to find what the opponent played in the PREVIOUS round
              if (pact === 'copy_opponent' && game.current_round > 1) {
                const prevRound = game.current_round - 1;
                const oppTeam = myTeam === 'A' ? 'B' : 'A';
                const prevOppTurnRes = await db.query(`
                  SELECT card_selected FROM round5_turns 
                  WHERE game_id = $1 AND round_number = $2 AND team = $3
                `, [gameId, prevRound, oppTeam]);
                
                if (prevOppTurnRes.rows[0]) {
                  finalCard = prevOppTurnRes.rows[0].card_selected;
                }
              }
            }

            // If this is sub-round 1, finalize the turn order based on who clicked first
            if (game.current_round === 1) {
              const u1 = isTeamA ? game.team_a_user1 : game.team_b_user1;
              const u2 = isTeamA ? game.team_a_user2 : game.team_b_user2;
              const finalizedOrder = currentUser.id === u1 ? [u1, u2] : [u2, u1];
              const orderField = isTeamA ? 'team_a_turn_order' : 'team_b_turn_order';
              await db.query(`UPDATE round5_games SET ${orderField} = $1 WHERE id = $2`, [JSON.stringify(finalizedOrder), gameId]);
            }

            await db.query(`
              INSERT INTO round5_turns (game_id, round_number, player_id, team, card_selected, is_revealed, pact_used)
              VALUES ($1, $2, $3, $4, $5, false, $6)
            `, [gameId, game.current_round, currentUser.id, myTeam, finalCard, pactToUse]);
            
            if (pactToUse) {
              const pactField = isTeamA ? 'team_a_pact_used' : 'team_b_pact_used';
              await db.query(`UPDATE round5_games SET ${pactField} = true WHERE id = $1`, [gameId]);
            }
            
            console.log(`Player ${currentUser.name} (Team ${myTeam}) selected ${finalCard} (Pact: ${pactToUse || 'None'}) for sub-round ${game.current_round}`);
            
            // Check if both teams have submitted for this round
            const currentTurns = await db.query(`SELECT id FROM round5_turns WHERE game_id = $1 AND round_number = $2`, [gameId, game.current_round]);
            if (currentTurns.rows.length >= 2) {
              console.log(`Both teams submitted for Game ${gameId} Round ${game.current_round}. Auto-resolving!`);
              await performR5Resolution(gameId);
            }
            
            await broadcastRound5Update();
          }
        }

        if (data.type === 'r5_resolve_turn' && currentUser.role === 'volunteer') {
          const { gameId } = data;
          await performR5Resolution(gameId);
        }

        if (data.type === 'r5_disqualify_team' && currentUser.role === 'volunteer') {
          const { gameId, team } = data; // team: 'A' or 'B'
          console.log(`Volunteer ${currentUser.name} DISQUALIFYING Team ${team} in Round 5 Game ${gameId}`);
          
          const result = team === 'A' ? 'team_b_win' : 'team_a_win';
          await db.query("UPDATE round5_games SET status = 'finished', result = $1 WHERE id = $2", [result, gameId]);
          
          // Handle eliminations
          const fullGame = (await db.query(`
            SELECT g.*, ta.user1_id as a1, ta.user2_id as a2, tb.user1_id as b1, tb.user2_id as b2
            FROM round5_games g JOIN teams ta ON g.team_a_id = ta.id LEFT JOIN teams tb ON g.team_b_id = tb.id
            WHERE g.id = $1
          `, [gameId])).rows[0];
          
          if (result === 'team_b_win') {
            await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [fullGame.a1, fullGame.a2]);
            await db.query('UPDATE users SET is_eliminated = false WHERE id IN ($1, $2)', [fullGame.b1, fullGame.b2]);
          } else {
            await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [fullGame.b1, fullGame.b2]);
            await db.query('UPDATE users SET is_eliminated = false WHERE id IN ($1, $2)', [fullGame.a1, fullGame.a2]);
          }
          
          await broadcastRound5Update();
        }

        if (data.type === 'r5_next_turn' && currentUser.role === 'volunteer') {
          const { gameId } = data;
          await performR5NextRound(gameId);
        }

        if (data.type === 'r5_end_now' && currentUser.role === 'volunteer') {
          const { gameId } = data;
          console.log(`FORCE ENDING R5 Game: ${gameId}`);
          await db.query('UPDATE round5_games SET status = \'finished\', result = \'manual_stop\' WHERE id = $1', [gameId]);
          await broadcastRound5Update();
        }

        if (data.type === 'finish_round_5' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Finishing Round 5...');
          await db.query("UPDATE game_state SET status = 'waiting' WHERE id = 1");
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          console.log('Round 5 finished');
        }

        if (data.type === 'start_round_6' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Starting Round 6 (The Game of Hearts)...');
          
          await db.query('DELETE FROM hearts_players');
          await db.query('UPDATE hearts_game_state SET current_cycle = 1, status = \'waiting\', winner_id = NULL WHERE id = 1');
          
          // Initialize hearts_players from alive players and teams
          const alivePlayers = await db.query("SELECT id, name FROM users WHERE role = 'player' AND is_eliminated = false");
          const teams = await db.query("SELECT * FROM teams WHERE round_formed = 2");

          for (const p of alivePlayers.rows) {
            const myTeam = teams.rows.find(t => t.user1_id === p.id || t.user2_id === p.id);
            const teammateId = myTeam ? (myTeam.user1_id === p.id ? myTeam.user2_id : myTeam.user1_id) : null;
            
            await db.query(`
              INSERT INTO hearts_players (user_id, teammate_id, hearts, is_alive)
              VALUES ($1, $2, 3, true)
            `, [p.id, teammateId]);
          }
          
          // Update Game State
          await db.query('UPDATE game_state SET current_round = 6, status = \'active\' WHERE id = 1');
          
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          await broadcastRound6Update();
        }

        if (data.type === 'r6_submit_action') {
          const { action, targetId } = data;
          console.log(`Player ${currentUser.name} submitted R6 action: ${action}`);
          await db.query(`
            UPDATE hearts_players 
            SET current_action = $1, target_id = $2 
            WHERE user_id = $3
          `, [action, targetId, currentUser.id]);
          await broadcastRound6Update();
        }

        if (data.type === 'r6_resolve_cycle' && currentUser.role === 'volunteer') {
          console.log('Resolving Game of Hearts cycle...');
          const r6State = await getRound6State();
          if (!r6State) return;

          const players = r6State.players;
          const actions = players.filter(p => p.current_action).map(p => ({
            user_id: p.user_id,
            action: p.current_action,
            target_id: p.target_id
          }));

          const result = heartsEngine.resolveCycle(players, actions);
          
          // Update players in DB
          for (const p of result.updatedPlayers) {
            await db.query(`
              UPDATE hearts_players 
              SET hearts = $1, is_alive = $2, current_action = NULL, target_id = NULL 
              WHERE user_id = $3
            `, [p.hearts, p.is_alive, p.user_id]);

            if (!p.is_alive) {
              await db.query('UPDATE users SET is_eliminated = true WHERE id = $1', [p.user_id]);
            }
          }

          // Check for winner
          if (result.winnerId) {
            await db.query('UPDATE hearts_game_state SET winner_id = $1, status = \'finished\' WHERE id = 1', [result.winnerId]);
          } else {
            await db.query('UPDATE hearts_game_state SET current_cycle = current_cycle + 1, status = \'waiting\' WHERE id = 1');
          }

          await broadcastRound6Update();
          // We could send logs as well, maybe via a separate message or adding to state
          broadcast({ type: 'r6_cycle_logs', logs: result.logs });
        }

        if (data.type === 'r6_start_voting' && currentUser.role === 'volunteer') {
          await db.query("UPDATE hearts_game_state SET status = 'acting' WHERE id = 1");
          await broadcastRound6Update();
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
          
          const matchRes = await db.query('SELECT * FROM round3_matches WHERE id = $1', [matchId]);
          const match = matchRes.rows[0];
          
          if (!match || match.volunteer_id !== currentUser.id || match.status !== 'active') return;
          
          const teamScoresKey = teamIndex === 1 ? 'team1_scores' : 'team2_scores';
          const currentScores = match[teamScoresKey] || [];
          
          // CRITICAL FIX: Prevent scoring twice in the same subround
          if (currentScores.length >= match.current_subround) {
            console.log(`Rejecting score: Team ${teamIndex} already scored for Round ${match.current_subround}`);
            return;
          }

          console.log(`Volunteer scoring Match ${matchId}, Team ${teamIndex} Round ${match.current_subround}: ${score}`);
          currentScores.push(score);
          
          await db.query(`UPDATE round3_matches SET ${teamScoresKey} = $1 WHERE id = $2`, [JSON.stringify(currentScores), matchId]);
          
          // Refresh match data
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

        if (data.type === 'disqualify_team' && currentUser.role === 'volunteer') {
          const { matchId, teamIndex } = data;
          console.log(`Volunteer ${currentUser.name} DISQUALIFYING Team ${teamIndex} in Match ${matchId}`);

          const matchRes = await db.query('SELECT * FROM round3_matches WHERE id = $1', [matchId]);
          const match = matchRes.rows[0];
          
          if (!match || match.status !== 'active') return;

          const disqualifiedId = teamIndex === 1 ? match.team1_id : match.team2_id;
          const passingId = teamIndex === 1 ? match.team2_id : match.team1_id;

          // 1. Mark match as finished with extreme scores
          await db.query(`
            UPDATE round3_matches 
            SET status = 'finished', 
                team1_scores = $1, 
                team2_scores = $2 
            WHERE id = $3`,
            [
              teamIndex === 1 ? [false, false, false] : [true, true, true],
              teamIndex === 2 ? [false, false, false] : [true, true, true],
              matchId
            ]
          );

          // 2. Eliminate the disqualified team members
          const dqUsersRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [disqualifiedId]);
          if (dqUsersRes.rows[0]) {
            const { user1_id, user2_id } = dqUsersRes.rows[0];
            await db.query('UPDATE users SET is_eliminated = true WHERE id IN ($1, $2)', [user1_id, user2_id]);
          }

          // 3. Ensure passing team members are safe (in case they were previously eliminated somehow, though unlikely)
          if (passingId) {
            const passUsersRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [passingId]);
            if (passUsersRes.rows[0]) {
              const { user1_id, user2_id } = passUsersRes.rows[0];
              await db.query('UPDATE users SET is_eliminated = false WHERE id IN ($1, $2)', [user1_id, user2_id]);
            }
          }

          // 4. Final Broadcast
          console.log(`Match ${matchId} finished via DQ. Broadcasting...`);
          await broadcastRound3Update();

          // Explicit notification for participants
          const participants = [];
          if (dqUsersRes.rows[0]) participants.push(dqUsersRes.rows[0].user1_id, dqUsersRes.rows[0].user2_id);
          if (passUsersRes && passUsersRes.rows[0]) participants.push(passUsersRes.rows[0].user1_id, passUsersRes.rows[0].user2_id);

          for (const pid of participants) {
            const client = clients.get(pid);
            if (client && client.socket.readyState === 1) {
              client.socket.send(JSON.stringify({ 
                type: 'duel_result', 
                matchId, 
                result: pid === (teamIndex === 1 ? dqUsersRes.rows[0]?.user1_id || dqUsersRes.rows[0]?.user2_id : passUsersRes?.rows[0]?.user1_id) ? 'disqualified' : 'won_by_dq'
              }));
            }
          }
        }

        if (data.type === 'r6_start_timer' && currentUser.role === 'volunteer') {
          console.log('Starting Round 6 Voting Timer...');
          await db.query(`
            UPDATE round6_state 
            SET subround_status = 'voting', 
                voting_started_at = CURRENT_TIMESTAMP,
                last_eliminated_id = null,
                last_partner_eliminated_id = null
            WHERE id = 1
          `);
          await broadcastRound6Update();
        }

        if (data.type === 'r6_vote' && currentUser.role === 'player') {
           const { targetId, useSafety } = data;
           
           // Check if player is eliminated
           const playerCheck = await db.query('SELECT is_eliminated FROM users WHERE id = $1', [currentUser.id]);
           if (playerCheck.rows[0]?.is_eliminated) {
             console.log(`Eliminated player ${currentUser.name} tried to vote. Blocked.`);
             return;
           }

           const r6State = await getRound6State();
           if (!r6State || r6State.subround_status !== 'voting') return;
           
           if (useSafety) {
             const userRes = await db.query("SELECT has_used_safety FROM users WHERE id = $1", [currentUser.id]);
             if (userRes.rows[0].has_used_safety) {
               console.log(`Player ${currentUser.name} tried to use safety again. Denied.`);
               return; // Cheat attempt
             }
           }
           
           try {
             await db.query(`
               INSERT INTO round6_votes (round_number, voter_id, target_id, used_safety)
               VALUES ($1, $2, $3, $4)
             `, [r6State.current_subround, currentUser.id, targetId, useSafety]);
             
             if (useSafety) {
               await db.query("UPDATE users SET has_used_safety = true WHERE id = $1", [currentUser.id]);
             }
             
             console.log(`Player ${currentUser.name} voted for ${targetId} (Safety: ${useSafety})`);
             await broadcastRound6Update();  
           } catch (e) {
             console.log('Vote error (duplicate?):', e.message);
           }
        }

        if (data.type === 'r6_resolve' && currentUser.role === 'volunteer') {
           await performR6Resolution();
        }

        if (data.type === 'r6_next_subround' && currentUser.role === 'volunteer') {
           await db.query("UPDATE round6_state SET current_subround = current_subround + 1, subround_status = 'waiting' WHERE id = 1");
           await broadcastRound6Update();
        }
        
        if (data.type === 'r6_finish' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
           console.log('Finishing Round 6...');
           await db.query("UPDATE game_state SET status = 'finished' WHERE id = 1");
           broadcast({ type: 'state_update', state: (await db.query("SELECT * FROM game_state WHERE id = 1")).rows[0] });
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

            // Sync teams for admin/volunteers
            await broadcastTeams();
            
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

        // ADMIN MANAGEMENT: ELIMINATE / REVIVE
        if (data.type === 'admin_manage_user' && currentUser.role === 'admin') {
          const { userId, isEliminated } = data;
          await db.query('UPDATE users SET is_eliminated = $1 WHERE id = $2', [isEliminated, userId]);
          console.log(`ADMIN: ${isEliminated ? 'ELIMINATED' : 'REVIVED'} user ${userId}`);
          
          // Broadcast update to all admins
          const usersRes = await db.query('SELECT id, name, email, role, is_eliminated FROM users ORDER BY name ASC');
          for (const [uid, client] of clients.entries()) {
            if (client.user.role === 'admin' && client.socket.readyState === 1) {
              client.socket.send(JSON.stringify({ type: 'admin_users', users: usersRes.rows }));
            }
            // Send to the specific user too so they see their status change
            if (uid === userId && client.socket.readyState === 1) {
              client.socket.send(JSON.stringify({ type: 'status_update', isEliminated }));
            }
          }
        }

        if (data.type === 'admin_manage_team' && currentUser.role === 'admin') {
          const { teamId, isEliminated } = data;
          const teamRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [teamId]);
          if (teamRes.rows[0]) {
            const { user1_id, user2_id } = teamRes.rows[0];
            await db.query('UPDATE users SET is_eliminated = $1 WHERE id IN ($2, $3)', [isEliminated, user1_id, user2_id]);
            console.log(`ADMIN: ${isEliminated ? 'ELIMINATED' : 'REVIVED'} team ${teamId} (${user1_id}, ${user2_id})`);
            
            // Broadcast update
            const usersRes = await db.query('SELECT id, name, email, role, is_eliminated FROM users ORDER BY name ASC');
            for (const [uid, client] of clients.entries()) {
               if (client.user.role === 'admin' && client.socket.readyState === 1) {
                 client.socket.send(JSON.stringify({ type: 'admin_users', users: usersRes.rows }));
               }
               if ((uid === user1_id || uid === user2_id) && client.socket.readyState === 1) {
                 client.socket.send(JSON.stringify({ type: 'status_update', isEliminated }));
               }
            }
          }
        }

        if (data.type === 'admin_reset_round' && currentUser.role === 'admin') {
          const targetRound = parseInt(data.round);
          console.log(`ADMIN RESET: Resetting to Round ${targetRound}`);
          
          try {
            await db.query('BEGIN');
            
            // 1. Update core game state
            await db.query("UPDATE game_state SET current_round = $1, status = 'active' WHERE id = 1", [targetRound]);

            // 2. Clear data for future rounds
            if (targetRound < 6) {
              await db.query("DELETE FROM hearts_players");
              await db.query("UPDATE hearts_game_state SET current_cycle = 1, status = 'waiting', winner_id = NULL WHERE id = 1");
            }
            if (targetRound < 5) {
              await db.query("DELETE FROM round5_turns");
              await db.query("DELETE FROM round5_games");
            }
            if (targetRound < 4) {
              await db.query("DELETE FROM round4_sessions");
            }
            if (targetRound < 3) {
              await db.query("DELETE FROM round3_matches");
            }
            if (targetRound <= 2) {
              await db.query("DELETE FROM teams WHERE round_formed >= 2");
              await db.query("UPDATE lottery_pool SET is_taken = false, taken_by = NULL");
            }
            if (targetRound <= 1) {
              await db.query("DELETE FROM submissions");
            }

            // 3. Revive all players for any reset to earlier rounds
            await db.query("UPDATE users SET is_eliminated = false WHERE role = 'player'");
            await db.query("UPDATE users SET has_used_safety = false");

            await db.query('COMMIT');
            console.log(`SUCCESS: Reset to Round ${targetRound} complete.`);
            
            // 4. Broadcast the new state and refresh data
            const newState = (await db.query('SELECT * FROM game_state WHERE id = 1')).rows[0];
            broadcast({ type: 'state_update', state: newState });
            
            // Refresh auxiliary data for admins/volunteers
            const pool = await getDetailedPool();
            const r3Matches = await getRound3Matches();
            const r4Sessions = await getRound4Sessions();
            const r5Games = await getRound5Games();
            const r6State = targetRound >= 6 ? await getRound6State() : null;
            const teamsRes = await db.query(`
               SELECT t.id, t.name, t.round_formed, u1.name as user1_name, u2.name as user2_name, u1.id as user1_id, u2.id as user2_id, u1.is_eliminated as user1_eliminated, u2.is_eliminated as user2_eliminated
               FROM teams t JOIN users u1 ON t.user1_id = u1.id JOIN users u2 ON t.user2_id = u2.id ORDER BY t.id DESC
            `);

            for (const [uid, client] of clients.entries()) {
              if (client.socket.readyState === 1 && (client.user.role === 'admin' || client.user.role === 'volunteer')) {
                client.socket.send(JSON.stringify({ type: 'lottery_pool', pool }));
                client.socket.send(JSON.stringify({ type: 'round3_matches', matches: r3Matches }));
                client.socket.send(JSON.stringify({ type: 'round4_sessions', sessions: r4Sessions }));
                client.socket.send(JSON.stringify({ type: 'round5_games', games: r5Games }));
                client.socket.send(JSON.stringify({ type: 'admin_teams', teams: teamsRes.rows }));
              }
              if (targetRound >= 6 && client.socket.readyState === 1) {
                client.socket.send(JSON.stringify({ type: 'round6_update', state: r6State }));
              }
            }
          } catch (e) {
            await db.query('ROLLBACK');
            console.error('RESET FAILED:', e);
          }
        }
      } catch (err) {
        console.error('WS Processing Error:', err);
      }
    });

    socket.on('close', () => {
      if (currentUser) {
        clients.delete(currentUser.id);
      }
      fastify.log.info('Client disconnected');
    });
  });

  fastify.get('/players', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    // Admin should get all players, regular users should exclude themselves
    if (request.user.id === 'admin-id') {
      const result = await db.query('SELECT id, name FROM users WHERE role = \'player\'');
      return result.rows;
    }
    const result = await db.query('SELECT id, name FROM users WHERE role = \'player\' AND id != $1', [request.user.id]);
    return result.rows;
  });
}

module.exports = fp(gameRoutes);
