const fp = require('fastify-plugin');
const db = require('../db');
const heartsEngine = require('./heartsEngine');

const HARD_QUOTES = [
  "Coding seekh le pehle.",
  "Your existence is a bug the system finally patched.",
  "Dank meme banne ke layak bhi nahi ho tum.",
  "Tujhse nahi ho payega, ghar ja beta.",
  "Skill issue detected: Life uninstalled.",
  "You were a variable, now you're a constant: Zero.",
  "Garbage collection in progress... Oh look, it's you.",
  "Syntax Error in your DNA.",
  "Your contribution has been noted and discarded like a null pointer.",
  "Connection severed. No one will miss you.",
  "Probably a front-end dev... couldn't handle the logic.",
  "Error 404: Worth not found.",
  "Even a random seed has more purpose than you.",
  "Process killed. Reason: Extreme mediocrity.",
  "You're the reason we have 'Expectation vs Reality' memes.",
  "Imagine losing this early. Embarrassing.",
  "Your logic is as broken as my production code.",
  "Selection sort would have been faster at removing you.",
  "Go back to Tutorial Island, kid.",
  "Zero impact, zero skill, zero future.",
  "The system has no mercy for basic units like you.",
  "You were the 'Hello World' of failure.",
  "Access denied permanently. Try being useful in another life.",
  "Your parents deserve an apology for this performance.",
  "Out of memory. Out of time. Out of talent.",
  "You didn't last this round, that's why she left you.",
  "Beta, Stack Overflow bhi tujhe reject kar dega.",
  "Tera code compile hi nahi hota, zindagi kya compile karegi.",
  "Runtime error: Confidence not found.",
  "You're not even beta, you're alpha-negative.",
  "Infinite loop of failure detected. Ctrl+C recommended.",
  "Deprecated human detected. Please upgrade.",
  "Your IQ is NaN.",
  "Try-catch kar le apni life ko, exception toh aayegi hi.",
  "Even console.log('you') prints nothing useful.",
  "Fork kar bhi koi tujhe merge nahi karega.",
  "Tera pull request forever pending rahega.",
  "Segmentation fault in your brain.",
  "Buffer overflow of excuses.",
  "You're the bug that no one wants to fix.",
  "Low battery, low skill, low everything.",
  "Commit kar diya tune apni mediocrity ko main branch mein.",
  "Async await kar raha hai success, but timeout ho jayega.",
  "Tujhe dekh ke lagta hai promise rejected by default.",
  "Even ChatGPT refuses to help you after reading your code.",
  "Your career path: 404 Not Found.",
  "Null reference exception when someone expects talent from you.",
  "You're the loading spinner of disappointment.",
  "Thread terminated: Useless activity detected.",
  "Memory leak in your potential.",
  "Tera existence ek edge case hai jo koi handle nahi karna chahta.",
  "Your code runs slower than a snail on dial-up internet.",
  "You're the reason we need code reviews... to prevent disasters like you.",
  "Even a broken clock has more uptime than your projects.",
  "Tera debugging skill itna weak hai ki bugs khud hi fix ho jate hain shame se.",
  "You're not a developer, you're a human copy-paste error.",
  "Your resume is just a list of Stack Overflow links.",
  "Error 500: Server can't handle your level of incompetence.",
  "You think recursion is deep? Wait till you see your failure loop.",
  "Your code is so bad, even minifiers give up and make it larger.",
  "Bro tried to flex with LeetCode easy... and still got TLE.",
  "You're the reason senior devs drink at 10 AM.",
  "Your Git history is cleaner than your code — because it's empty.",
  "Even AI says 'I can't fix this' when it sees your logic.",
  "You didn't break the build... you are the broken build.",
  "Your optimism about deadlines is adorable. Reality is coming.",
  "Tera code review feedback: 'Please never touch code again.'",
  "You're proof that natural selection doesn't apply to programmers.",
  "Your LinkedIn says 'Full Stack' but it's actually 'Full Lack'.",
  "The only thing you're deploying successfully is disappointment.",
  "You call it 'spaghetti code', pros call it 'your entire codebase'.",
  "Your salary negotiation failed because even money doesn't want you."
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

  const broadcast = (data) => {
    const msg = JSON.stringify(data);
    for (const { socket } of clients.values()) {
      if (socket.readyState === 1) { // OPEN
        socket.send(msg);
      }
    }
  };

  const broadcastLeaderboard = async () => {
    const leaderboard = await calculateLeaderboard();
    broadcast({ type: 'leaderboard_update', leaderboard });
  };

  const broadcastAdminUsers = async () => {
    const allUsersRes = await db.query('SELECT id, name, email, role, is_eliminated FROM users ORDER BY name');
    const admin_users = allUsersRes.rows;
    for (const [userId, { socket, user }] of clients.entries()) {
      if (socket.readyState === 1 && user.role === 'admin') {
        socket.send(JSON.stringify({ type: 'admin_users', users: admin_users }));
      }
    }
  };

  const broadcastAllAdminData = async () => {
    await broadcastAdminUsers();
    await broadcastTeams();
    await broadcastLeaderboard();
  };

  fastify.decorate('broadcastLeaderboard', broadcastLeaderboard);
  fastify.decorate('broadcastAdminUsers', broadcastAdminUsers);
  fastify.decorate('broadcastTeams', broadcastTeams);
  fastify.decorate('broadcastAllAdminData', broadcastAllAdminData);

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
      WHERE (lp.content->>'type') != 'config'
      ORDER BY lp.id ASC
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

    // Calculate winner on the fly
    return res.rows.map(m => {
      const t1Positives = (m.team1_scores || []).filter(s => s === true).length;
      const t2Positives = (m.team2_scores || []).filter(s => s === true).length;

      let winner_name = null;
      let winner_team_id = null;

      if (m.status === 'finished') {
        const t1Safe = t1Positives >= 2;
        const t2Safe = t2Positives >= 2;

        if (t1Safe && !t2Safe) {
          winner_name = m.team1_name;
          winner_team_id = m.team1_id;
        } else if (t2Safe && !t1Safe) {
          winner_name = m.team2_name;
          winner_team_id = m.team2_id;
        } else if (t1Safe && t2Safe) {
          winner_name = "BOTH SURVIVED";
        } else {
          winner_name = "BOTH ELIMINATED";
        }
      }

      return {
        ...m,
        winner_name,
        winner_team_id
      };
    });
  }

  async function getRound4Sessions() {
    const res = await db.query(`
      SELECT 
        s.id, s.team_id, s.volunteer_id, s.status, s.result,
        t.name as team_name,
        t.user1_id, t.user2_id,
        u1.name as user1_name, u2.name as user2_name,
        u1.is_eliminated as user1_eliminated, u2.is_eliminated as user2_eliminated,
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
      g.team_a_exhausted_cards, g.team_b_exhausted_cards,
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

// Card Exhaustion System helpers
const ALL_CARDS = ['ATTACK', 'FORTIFY', 'CONVERGE'];

function getAvailableCards(exhaustedCards) {
  // Returns cards that are NOT exhausted
  const exhausted = exhaustedCards || [];
  return ALL_CARDS.filter(card => !exhausted.includes(card));
}

function updateExhaustedCards(exhaustedCards, cardUsed) {
  // Add the used card to exhausted list
  const exhausted = [...(exhaustedCards || [])];
  if (!exhausted.includes(cardUsed)) {
    exhausted.push(cardUsed);
  }
  
  // If all 3 cards are exhausted, reset the hand
  if (exhausted.length >= 3) {
    return []; // Hand refreshes
  }
  
  return exhausted;
}

// ROUND 6 HELPERS (THE GAME OF HEARTS)
async function getRound6State() {
  console.log('Fetching Round 6 State...');
  const stateRes = await db.query('SELECT * FROM round6_state WHERE id = 1');
  if (!stateRes.rows[0]) {
    console.log('Round 6 State row NOT FOUND in database!');
    return null;
  }
  const state = stateRes.rows[0];
  
  // Attach votes for the current cycle (monitor view)
  const votesRes = await db.query('SELECT * FROM round6_votes WHERE cycle = $1', [state.current_cycle]);
  state.votes = votesRes.rows;
  
  // Attach alive players
  const playersRes = await db.query("SELECT id, name, has_used_safety, is_eliminated FROM users WHERE role = 'player' ORDER BY name ASC");
  state.players = playersRes.rows;

  // Attach history
  const historyRes = await db.query(`
    SELECT h.*, u1.name as target_name, u2.name as partner_name 
    FROM round6_history h
    LEFT JOIN users u1 ON h.target_id = u1.id
    LEFT JOIN users u2 ON h.partner_id = u2.id
    ORDER BY subround ASC
  `);
  state.history = historyRes.rows;
  
  return state;
}

const broadcastRound6Update = async () => {
  const r6State = await getRound6State();
  if (!r6State) return;
  console.log('Broadcasting Round 6 Update...');
  broadcast({ type: 'round6_update', state: r6State });
}


async function performR7Resolution() {
  try {
    console.log('Resolving Game of Hearts cycle...');
    const r7State = await getRound7State();
    if (!r7State) return;

    const players = r7State.players;
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
      if (result.winnerId === 'BOTH') {
        // Dual winners - we don't set a single winner_id, but we finish the game
        await db.query('UPDATE hearts_game_state SET status = \'finished\' WHERE id = 1');
      } else {
        await db.query('UPDATE hearts_game_state SET winner_id = $1, status = \'finished\' WHERE id = 1', [result.winnerId]);
      }
    } else {
      // Check if we've transitioned to the final two
      const aliveCount = result.updatedPlayers.filter(p => p.is_alive).length;
      
      if (aliveCount === 2) {
        console.log('⚔️ FINAL DUEL INITIATED: Setting both survivors to 1 heart each');
        // Set both remaining players to 1 heart for the final duel
        await db.query(`
          UPDATE hearts_players 
          SET hearts = 1 
          WHERE is_alive = true
        `);
      }
      
      // AUTO-CONTINUE: Increment cycle and keep status as 'acting'
      await db.query('UPDATE hearts_game_state SET current_cycle = current_cycle + 1, status = \'acting\' WHERE id = 1');
    }

    await broadcastRound7Update();
    broadcast({ type: 'r7_cycle_logs', logs: result.logs });
  } catch (err) {
    console.error("ERROR IN R7 RESOLUTION:", err);
  }
}

async function getRound7State() {
  console.log('Fetching Round 7 State (Hearts)...');
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

const broadcastRound7Update = async () => {
  const r7State = await getRound7State();
  if (!r7State) return;
  console.log('Broadcasting Round 7 Update...');
  broadcast({ type: 'round7_update', state: r7State });
}

const performR6Resolution = async () => {
  const r6State = await getRound6State();
  if (!r6State || r6State.status !== 'voting') return;
  const votes = r6State.votes || [];
  const activePlayers = r6State.players.filter(p => !p.is_eliminated);
  const voterIds = votes.map(v => v.voter_id);
  const nonVoters = activePlayers.filter(p => !voterIds.includes(p.id));

  for (const p of nonVoters) {
    console.log(`Player ${p.name} failed to vote. AUTO-ELIMINATING.`);
    await db.query("UPDATE users SET is_eliminated = true WHERE id = $1", [p.id]);
    
    const teamRes = await db.query("SELECT * FROM teams WHERE round_formed = 2 AND (user1_id = $1 OR user2_id = $1)", [p.id]);
    const team = teamRes.rows[0];
    let partnerId = null;
    if (team) {
      partnerId = team.user1_id === p.id ? team.user2_id : team.user1_id;
      const pCheck = await db.query("SELECT is_eliminated FROM users WHERE id = $1", [partnerId]);
      if (pCheck.rows[0] && !pCheck.rows[0].is_eliminated) {
        console.log(`Partner ${partnerId} also eliminated (Collateral).`);
        await db.query("UPDATE users SET is_eliminated = true WHERE id = $1", [partnerId]);
      } else {
        partnerId = null;
      }
    }
    
    await db.query(`
      INSERT INTO round6_history (subround, target_id, partner_id, reason)
      VALUES ($1, $2, $3, 'timeout')
    `, [r6State.current_cycle, p.id, partnerId]);
  }

  // 2. Tally and eliminate voted target (if still alive)
  const tally = {};
  votes.forEach(v => {
    tally[v.target_id] = (tally[v.target_id] || 0) + 1;
  });
  
  let maxVotes = 0;
  let candidates = [];
  for (const [pid, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidates = [pid];
    } else if (count === maxVotes) {
      candidates.push(pid);
    }
  }

  let targetId = null;
  if (candidates.length === 1) {
    targetId = candidates[0];
  } else if (candidates.length > 1) {
    console.log(`Tie detected between ${candidates.length} players (${maxVotes} votes each). Standoff reached: No voting elimination occurs.`);
    await db.query(`
      INSERT INTO round6_history (subround, reason)
      VALUES ($1, 'standoff')
    `, [r6State.current_cycle]);
  }

  let eliminatedId = null;
  let partnerId = null;
  
  if (targetId) {
    // Check if target is already dead from non-vote penalty or previous cycle
    const targetCheck = await db.query("SELECT is_eliminated FROM users WHERE id = $1", [targetId]);
    if (targetCheck.rows[0]?.is_eliminated) {
      console.log(`Target ${targetId} is already eliminated. Vote resolution skipped for this target.`);
    } else {
      const targetVoteRecord = votes.find(v => v.voter_id === targetId);
      if (targetVoteRecord && targetVoteRecord.used_safety) {
        console.log(`Player ${targetId} used SAFETY and survived!`);
        // Record safety usage in history
        await db.query(`
          INSERT INTO round6_history (subround, target_id, reason)
          VALUES ($1, $2, 'safety')
        `, [r6State.current_cycle, targetId]);
      } else {
        eliminatedId = targetId;
        console.log(`Player ${targetId} eliminated with ${maxVotes} votes.`);
        await db.query("UPDATE users SET is_eliminated = true WHERE id = $1", [targetId]);
        
        const teamRes = await db.query("SELECT * FROM teams WHERE round_formed = 2 AND (user1_id = $1 OR user2_id = $1)", [targetId]);
        const team = teamRes.rows[0];
        if (team) {
          partnerId = team.user1_id === targetId ? team.user2_id : team.user1_id;
          const pCheck = await db.query("SELECT is_eliminated FROM users WHERE id = $1", [partnerId]);
          if (pCheck.rows[0] && !pCheck.rows[0].is_eliminated) {
             console.log(`Partner ${partnerId} also eliminated (Collateral Damage).`);
             await db.query("UPDATE users SET is_eliminated = true WHERE id = $1", [partnerId]);
          } else {
            partnerId = null;
          }
        }

        // Record in history
        await db.query(`
          INSERT INTO round6_history (subround, target_id, partner_id, reason)
          VALUES ($1, $2, $3, 'vote')
        `, [r6State.current_cycle, eliminatedId, partnerId]);
      }
    }
  }

  await db.query(`UPDATE round6_state SET status = 'finished' WHERE id = 1`);
  await broadcastRound6Update();
}

// ROUND 6 TIMER REMOVED - VOLUNTEER CONTROLLED

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
          let stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          if (stateRes.rows.length === 0) {
            // Bootstrap game_state if missing to avoid admin/client stalling on load
            await db.query("INSERT INTO game_state (id, current_round, status) VALUES (1, 1, 'active')");
            stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          }
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
          
          // Gather all necessary data for the user's role
          const r6State = stateRes.rows[0].current_round >= 6 ? await getRound6State() : null;
          const r7State = stateRes.rows[0].current_round >= 7 ? await getRound7State() : null;
          
          let round3_matches = null;
          let round4_sessions = null;
          let round5_games = null;
          let admin_teams = null;
          let admin_users = null;
          let lottery_pool = null;

          if (currentUser.role === 'volunteer' || currentUser.role === 'admin') {
            const lotteryRes = await db.query("SELECT * FROM lottery_pool WHERE (content->>'type') != 'config' ORDER BY id");
            lottery_pool = lotteryRes.rows;
            round3_matches = await getRound3Matches();
            round4_sessions = await getRound4Sessions();
            round5_games = await getRound5Games();
            
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
            admin_teams = teamsRes.rows;

            if (currentUser.role === 'admin') {
              const allUsersRes = await db.query('SELECT id, name, email, role, is_eliminated FROM users ORDER BY name');
              admin_users = allUsersRes.rows;
            }
          }

          // Get team info for the current user (skip for static admin, which is not a UUID)
          let teamInfo = null;
          if (currentUser.id !== 'admin-id') {
            const teamInfoRes = await db.query(`
              SELECT t.name as team_name, 
                     u1.name as user1_name, u2.name as user2_name,
                     u1.id as user1_id, u2.id as user2_id
              FROM teams t
              JOIN users u1 ON t.user1_id = u1.id
              JOIN users u2 ON t.user2_id = u2.id
              WHERE t.user1_id = $1 OR t.user2_id = $1
            `, [currentUser.id]);
            
            if (teamInfoRes.rows.length > 0) {
              const t = teamInfoRes.rows[0];
              teamInfo = {
                teamName: t.team_name,
                partnerName: t.user1_id === currentUser.id ? t.user2_name : t.user1_name
              };
            }
          }

          socket.send(JSON.stringify({ 
            type: 'init', 
            state: stateRes.rows[0],
            leaderboard,
            submission,
            isEliminated,
            round6_state: r6State,
            round7_state: r7State,
            round3_matches,
            round4_sessions,
            round5_games,
            admin_teams,
            admin_users,
            lottery_pool,
            teamInfo
          }));
          // If round 2 is active, send the pool
          if (stateRes.rows[0].current_round === 2) {
            if (currentUser.role === 'volunteer') {
              const pool = await getDetailedPool();
              socket.send(JSON.stringify({ type: 'lottery_pool', pool }));
            } else {
              const poolRes = await db.query("SELECT id, is_taken, taken_by FROM lottery_pool WHERE (content->>'type') != 'config' ORDER BY id ASC");
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
            if (currentUser.role === 'volunteer' || currentUser.role === 'admin') {
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
            if (currentUser.role === 'volunteer' || currentUser.role === 'admin') {
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
            if (currentUser.role === 'volunteer' || currentUser.role === 'admin') {
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
          await broadcastAllAdminData();
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
          
          // Target pool size is exactly the number of selectors
          const poolTargetSize = selectors.length;
          console.log(`[DEBUG] Target Pool Size (Selectors): ${poolTargetSize}`);

          // 1. Add Leaders (up to poolTargetSize)
          // We can't add more leaders than there are cards, though usually Leaders < Selectors
          const leadersToAdd = leaders.slice(0, poolTargetSize);
          const poolItems = leadersToAdd.map(l => ({ type: 'player', id: l.id, name: l.name }));
          console.log(`[DEBUG] Added ${poolItems.length} leader cards.`);

          // 2. Fill remainder with Quotes
          const quotesNeeded = poolTargetSize - poolItems.length;
          console.log(`[DEBUG] Filling with ${quotesNeeded} quotes.`);
          
          for (let i = 0; i < quotesNeeded; i++) {
            const quote = HARD_QUOTES[i % HARD_QUOTES.length];
            poolItems.push({ type: 'quote', text: quote });
          }
          
          console.log(`[DEBUG] Final Pool Size: ${poolItems.length}`);
          
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
          await broadcastAllAdminData();
          
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
            await broadcastAllAdminData();
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
          await broadcastAllAdminData();
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
          
          await db.query('BEGIN');
          
          // Eliminate players from teams that did not PASS
          // This includes 'waiting', 'active', 'fail', or anything else
          await db.query(`
             UPDATE users 
             SET is_eliminated = true 
             WHERE id IN (
               SELECT t.user1_id FROM round4_sessions s JOIN teams t ON s.team_id = t.id WHERE s.result != 'pass' OR s.result IS NULL
               UNION
               SELECT t.user2_id FROM round4_sessions s JOIN teams t ON s.team_id = t.id WHERE s.result != 'pass' OR s.result IS NULL
             )
          `);
          
          console.log('Eliminated players from teams that did not pass Round 4.');

          await db.query("UPDATE game_state SET status = 'waiting' WHERE id = 1");
          await db.query('COMMIT');

          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          await broadcastRound4Update(); // To show updated eliminations
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
              9, // Initial Momentum
              9
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
          await broadcastAllAdminData();
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

            // Card Exhaustion validation
            const exhaustedCards = isTeamA ? (game.team_a_exhausted_cards || []) : (game.team_b_exhausted_cards || []);
            const availableCards = getAvailableCards(exhaustedCards);
            
            // Validate the selected card is available (not exhausted)
            if (!availableCards.includes(card)) {
              console.log(`Card ${card} is exhausted for Team ${myTeam}. Available: ${availableCards.join(', ')}`);
              socket.send(JSON.stringify({ 
                type: 'error', 
                message: `Card ${card} is exhausted! Available cards: ${availableCards.join(', ')}` 
              }));
              return;
            }

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
            
            // Update card exhaustion - add the played card to exhausted list
            const newExhaustedCards = updateExhaustedCards(exhaustedCards, finalCard);
            const exhaustedField = isTeamA ? 'team_a_exhausted_cards' : 'team_b_exhausted_cards';
            await db.query(`UPDATE round5_games SET ${exhaustedField} = $1 WHERE id = $2`, [JSON.stringify(newExhaustedCards), gameId]);
            console.log(`Team ${myTeam} exhausted cards updated: ${JSON.stringify(newExhaustedCards)}`);
            
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
          const { gameId, outcome } = data; // outcome: 'A', 'B', 'BOTH', 'NONE'
          console.log(`FORCE ENDING R5 Game: ${gameId} -> MANUAL STOP (Outcome: ${outcome})`);
          
          let resultStr = 'manual_stop';
          if (outcome === 'A') resultStr = 'team_a_won';
          if (outcome === 'B') resultStr = 'team_b_won';
          if (outcome === 'BOTH') resultStr = 'both_won_manual';
          if (outcome === 'NONE') resultStr = 'manual_stop';

          await db.query('UPDATE round5_games SET status = \'finished\', result = $1 WHERE id = $2', [resultStr, gameId]);
          
          const game = (await db.query(`
            SELECT g.*, 
            ta.user1_id as a1, ta.user2_id as a2, 
            tb.user1_id as b1, tb.user2_id as b2
            FROM round5_games g 
            JOIN teams ta ON g.team_a_id = ta.id 
            LEFT JOIN teams tb ON g.team_b_id = tb.id
            WHERE g.id = $1
          `, [gameId])).rows[0];

          if (game) {
            if (outcome === 'A') {
              // Eliminate Team B
              const victims = [game.b1, game.b2].filter(Boolean);
              if (victims.length) await db.query('UPDATE users SET is_eliminated = true WHERE id = ANY($1)', [victims]);
            } else if (outcome === 'B') {
               // Eliminate Team A
              const victims = [game.a1, game.a2].filter(Boolean);
              if (victims.length) await db.query('UPDATE users SET is_eliminated = true WHERE id = ANY($1)', [victims]);
            } else if (outcome === 'NONE') {
               // Eliminate Both
               const victims = [game.a1, game.a2, game.b1, game.b2].filter(Boolean);
               if (victims.length) await db.query('UPDATE users SET is_eliminated = true WHERE id = ANY($1)', [victims]);
            } else if (outcome === 'BOTH') {
               // Eliminate Nobody
               console.log(`Manual Override: Both teams pass in Game ${gameId}`);
            }
          }

          await broadcastRound5Update();
        }

        if (data.type === 'finish_round_5' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Finishing Round 5...');
          
          // Verify all games are finished
          const gamesRes = await db.query("SELECT * FROM round5_games WHERE status != 'finished'");
          if (gamesRes.rows.length > 0) {
            socket.send(JSON.stringify({ 
              type: 'error', 
              message: `Cannot finish Round 5: ${gamesRes.rows.length} game(s) still in progress.` 
            }));
            return;
          }
          
          // Eliminate teams that lost (didn't reach required momentum)
          const allGamesRes = await db.query("SELECT * FROM round5_games WHERE status = 'finished'");
          for (const game of allGamesRes.rows) {
            // Determine loser based on result
            let loserTeamId = null;
            if (game.result === 'team_a_won') {
              loserTeamId = game.team_b_id;
            } else if (game.result === 'team_b_won') {
              loserTeamId = game.team_a_id;
            }
            
            if (loserTeamId) {
              // Eliminate both players in the losing team
              const teamRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [loserTeamId]);
              if (teamRes.rows.length > 0) {
                const team = teamRes.rows[0];
                await db.query('UPDATE users SET is_eliminated = true WHERE id = $1 OR id = $2', 
                  [team.user1_id, team.user2_id]);
                console.log(`Eliminated team ${loserTeamId} for losing Round 5`);
              }
            }
          }
          
          await db.query("UPDATE game_state SET status = 'waiting' WHERE id = 1");
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          console.log('Round 5 finished');
        }

        if (data.type === 'start_round_6' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Starting Round 6 (Pigeon Round)...');
          await db.query('DELETE FROM round6_votes');
          await db.query('DELETE FROM round6_history');
          await db.query(`
            INSERT INTO round6_state (id, current_cycle, status) 
            VALUES (1, 1, 'waiting') 
            ON CONFLICT (id) DO UPDATE SET current_cycle = 1, status = 'waiting'
          `);
          await db.query("UPDATE game_state SET current_round = 6, status = 'active' WHERE id = 1");
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          await broadcastAllAdminData();
          await broadcastRound6Update();
        }

        if (data.type === 'start_round_7' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
          console.log('Starting Round 7 (The Game of Hearts)...');
          
          await db.query('DELETE FROM hearts_players');
          // Reset game state to cycle 1, status acting (AUTO START), no winner. Ensure row exists.
          await db.query(`
            INSERT INTO hearts_game_state (id, current_cycle, status, winner_id) 
            VALUES (1, 1, 'acting', NULL) 
            ON CONFLICT (id) DO UPDATE SET current_cycle = 1, status = 'acting', winner_id = NULL
          `);
          
          // Initialize hearts_players from alive players
          const alivePlayers = await db.query("SELECT id, name FROM users WHERE role = 'player' AND is_eliminated = false");
          const teams = await db.query("SELECT * FROM teams WHERE round_formed = 2");

          // Always start with 3 hearts - transition to 1 happens dynamically when reduced to 2 players
          const initialHearts = 3;

          for (const p of alivePlayers.rows) {
            const myTeam = teams.rows.find(t => t.user1_id === p.id || t.user2_id === p.id);
            const teammateId = myTeam ? (myTeam.user1_id === p.id ? myTeam.user2_id : myTeam.user1_id) : null;
            await db.query(`
              INSERT INTO hearts_players (user_id, teammate_id, hearts, is_alive)
              VALUES ($1, $2, $3, true)
            `, [p.id, teammateId, initialHearts]);
          }

          // Ensure state reflects current round
          await db.query("UPDATE game_state SET current_round = 7, status = 'active' WHERE id = 1");
          const stateRes = await db.query('SELECT * FROM game_state WHERE id = 1');
          broadcast({ type: 'state_update', state: stateRes.rows[0] });
          await broadcastAllAdminData();
          await broadcastRound7Update();
        }

        if (data.type === 'r7_submit_action') {
          const { action, targetId } = data;
          console.log(`Player ${currentUser.name} submitted R7 action: ${action}`);

          // Verify player is alive
          const playerCheck = await db.query('SELECT is_alive FROM hearts_players WHERE user_id = $1', [currentUser.id]);
          if (!playerCheck.rows[0] || !playerCheck.rows[0].is_alive) {
            console.log(`Action rejected: Player ${currentUser.name} is dead.`);
            return;
          }

          await db.query(`
            UPDATE hearts_players 
            SET current_action = $1, target_id = $2 
            WHERE user_id = $3
          `, [action, targetId, currentUser.id]);

          // Check for auto-resolution
          const r7State = await getRound7State();
          const alivePlayers = r7State.players.filter(p => p.is_alive);
          const activeActions = alivePlayers.filter(p => p.current_action);

          console.log(`[R7 Check] Alive: ${alivePlayers.length}, Acted: ${activeActions.length}`);
          
          // Wait for ALL players to act before resolving (including Final Duel - must be simultaneous)
          if (alivePlayers.length > 0 && activeActions.length === alivePlayers.length) {
            if (alivePlayers.length === 2) {
              console.log("FINAL DUEL: BOTH PLAYERS ACTED. RESOLVING SIMULTANEOUSLY...");
            } else {
              console.log("ALL PLAYERS ACTED. AUTO-RESOLVING ROUND 7 CYCLE...");
            }
            await performR7Resolution();
          } else {
            await broadcastRound7Update();
          }
        }

        if (data.type === 'r7_resolve_cycle' && currentUser.role === 'volunteer') {
           // Manual override just in case
           await performR7Resolution();
        }

        if (data.type === 'r7_start_voting' && currentUser.role === 'volunteer') {
          console.log('Starting R7 Cycle Voting Phase...');
          await db.query("UPDATE hearts_game_state SET status = 'acting' WHERE id = 1");
          await broadcastRound7Update();
        }

        if (data.type === 'r7_reset_cycle' && currentUser.role === 'volunteer') {
          console.log('Resetting R7 Cycle...');
          await db.query("UPDATE hearts_game_state SET status = 'waiting' WHERE id = 1");
          // Clear current actions
           await db.query("UPDATE hearts_players SET current_action = NULL, target_id = NULL");
          await broadcastRound7Update();
        }

        if (data.type === 'r6_start_timer' && currentUser.role === 'volunteer') {
          console.log('Commencing Round 6 Voting Phase...');
          await db.query(`
            UPDATE round6_state 
            SET status = 'voting'
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
           if (!r6State || r6State.status !== 'voting') return;
           
           try {
             const currentCycle = r6State.current_cycle;
             await db.query(`
               INSERT INTO round6_votes (cycle, voter_id, target_id, used_safety)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (voter_id, cycle) DO UPDATE SET target_id = $3, used_safety = $4
             `, [currentCycle, currentUser.id, targetId, useSafety || false]);
             
             if (useSafety) {
               await db.query("UPDATE users SET has_used_safety = true WHERE id = $1", [currentUser.id]);
             }
             
             console.log(`Player ${currentUser.name} voted for ${targetId} (Safety: ${useSafety})`);
             await broadcastRound6Update();  
           } catch (e) {
             console.log('Vote error:', e.message);
           }
        }

        if (data.type === 'r6_resolve' && currentUser.role === 'volunteer') {
           await performR6Resolution();
        }

        if (data.type === 'r6_next_subround' && currentUser.role === 'volunteer') {
           await db.query("UPDATE round6_state SET current_cycle = current_cycle + 1, status = 'waiting' WHERE id = 1");
           await broadcastRound6Update();
        }
        
        if (data.type === 'r6_finish' && (currentUser.role === 'admin' || currentUser.role === 'volunteer')) {
           console.log('Finishing Round 6...');
           // Transition to Round 7 ONLY if 2 teams left
           const teamsRes = await db.query("SELECT * FROM teams WHERE round_formed = 2");
           const alivePlayersRes = await db.query("SELECT id FROM users WHERE role = 'player' AND is_eliminated = false");
           const aliveIds = alivePlayersRes.rows.map(r => r.id);
           const intactTeams = teamsRes.rows.filter(t => aliveIds.includes(t.user1_id) && aliveIds.includes(t.user2_id));
           
           if (intactTeams.length > 2) {
             // Stay in Round 6? Or just warning?
             // Usually, GM decides when to finish.
           }
           
           await db.query("UPDATE game_state SET status = 'waiting' WHERE id = 1");
           broadcast({ type: 'state_update', state: (await db.query("SELECT * FROM game_state WHERE id = 1")).rows[0] });
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
              const leaderData = clients.get(content.id);
              if (leaderData && leaderData.socket) {
                leaderData.socket.send(JSON.stringify({ 
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
          
          // Notify the specific user so they see their status change
          const client = clients.get(userId);
          if (client && client.socket.readyState === 1) {
            client.socket.send(JSON.stringify({ type: 'status_update', isEliminated }));
          }
          
          // Broadcast update to all admins/volunteers
          await broadcastAllAdminData();
        }

        if (data.type === 'admin_manage_team' && currentUser.role === 'admin') {
          const { teamId, isEliminated } = data;
          const teamRes = await db.query('SELECT user1_id, user2_id FROM teams WHERE id = $1', [teamId]);
          if (teamRes.rows[0]) {
            const { user1_id, user2_id } = teamRes.rows[0];
            await db.query('UPDATE users SET is_eliminated = $1 WHERE id IN ($2, $3)', [isEliminated, user1_id, user2_id]);
            console.log(`ADMIN: ${isEliminated ? 'ELIMINATED' : 'REVIVED'} team ${teamId} (${user1_id}, ${user2_id})`);
            
            // Notify the specific users
            [user1_id, user2_id].forEach(uid => {
              const client = clients.get(uid);
              if (client && client.socket.readyState === 1) {
                client.socket.send(JSON.stringify({ type: 'status_update', isEliminated }));
              }
            });

            // Broadcast update to all admins/volunteers
            await broadcastAllAdminData();
          }
        }

        if (data.type === 'admin_delete_user' && currentUser.role === 'admin') {
          const { userId } = data;
          try {
            // Delete dependent records first to avoid FK violations
            await db.query('DELETE FROM teams WHERE user1_id = $1 OR user2_id = $1', [userId]);
            await db.query('DELETE FROM submissions WHERE user_id = $1', [userId]);
            await db.query('DELETE FROM lottery_pool WHERE taken_by = $1', [userId]);
            await db.query('DELETE FROM round3_matches WHERE volunteer_id = $1', [userId]);
            await db.query('DELETE FROM round4_sessions WHERE volunteer_id = $1', [userId]);
            await db.query('DELETE FROM round5_games WHERE volunteer_id = $1', [userId]);
            await db.query('DELETE FROM round6_votes WHERE voter_id = $1 OR target_id = $1', [userId]);
            
            await db.query('DELETE FROM users WHERE id = $1', [userId]);
            console.log(`ADMIN: DELETED user ${userId}`);
            await broadcastAllAdminData();
          } catch (err) {
            console.error('DELETE USER ERROR:', err);
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to delete user: ' + err.message }));
          }
        }

        if (data.type === 'admin_delete_team' && currentUser.role === 'admin') {
          const { teamId } = data;
          try {
            // Delete dependent records first
            await db.query('DELETE FROM round3_matches WHERE team1_id = $1 OR team2_id = $1', [teamId]);
            await db.query('DELETE FROM round4_sessions WHERE team_id = $1', [teamId]);
            await db.query('DELETE FROM round5_games WHERE team_a_id = $1 OR team_b_id = $1', [teamId]);
            
            await db.query('DELETE FROM teams WHERE id = $1', [teamId]);
            console.log(`ADMIN: DELETED team ${teamId}`);
            await broadcastAllAdminData();
          } catch (err) {
            console.error('DELETE TEAM ERROR:', err);
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to delete team: ' + err.message }));
          }
        }

        if (data.type === 'admin_create_team' && currentUser.role === 'admin') {
          const { user1Id, user2Id, teamName } = data;
          await db.query(
            'INSERT INTO teams (user1_id, user2_id, round_formed, name) VALUES ($1, $2, 2, $3)',
            [user1Id, user2Id, teamName]
          );
          console.log(`ADMIN: CREATED team ${teamName} for ${user1Id} and ${user2Id}`);
          
          // Notify players
          const u1Res = await db.query('SELECT name FROM users WHERE id = $1', [user1Id]);
          const u2Res = await db.query('SELECT name FROM users WHERE id = $1', [user2Id]);
          
          const c1 = clients.get(user1Id);
          if (c1 && c1.socket.readyState === 1) {
            c1.socket.send(JSON.stringify({ 
              type: 'selection_result', 
              result: { type: 'team', partner: u2Res.rows[0]?.name, teamName } 
            }));
          }
          
          const c2 = clients.get(user2Id);
          if (c2 && c2.socket.readyState === 1) {
            c2.socket.send(JSON.stringify({ 
              type: 'selection_result', 
              result: { type: 'team', partner: u1Res.rows[0]?.name, teamName } 
            }));
          }

          await broadcastAllAdminData();
        }

        if (data.type === 'admin_reset_round' && currentUser.role === 'admin') {
          const targetRound = parseInt(data.round);
          console.log(`ADMIN RESET: Resetting to Round ${targetRound}`);
          
          try {
            await db.query('BEGIN');
            
            // 1. Update core game state
            await db.query("UPDATE game_state SET current_round = $1, status = 'active' WHERE id = 1", [targetRound]);

            // 2. Clear data for future rounds
            if (targetRound < 7) {
              await db.query("DELETE FROM hearts_players");
              await db.query(`
                INSERT INTO hearts_game_state (id, current_cycle, status, winner_id) 
                VALUES (1, 1, 'waiting', NULL) 
                ON CONFLICT (id) DO UPDATE SET current_cycle = 1, status = 'waiting', winner_id = NULL
              `);
            }
            if (targetRound < 6) {
              await db.query("DELETE FROM round6_votes");
              await db.query("DELETE FROM round6_history");
              await db.query(`
                INSERT INTO round6_state (id, current_cycle, status) 
                VALUES (1, 1, 'waiting') 
                ON CONFLICT (id) DO UPDATE SET current_cycle = 1, status = 'waiting'
              `);
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
            await broadcastAllAdminData();
            
            // Refresh auxiliary data for admins/volunteers
            const pool = await getDetailedPool();
            const r3Matches = await getRound3Matches();
            const r4Sessions = await getRound4Sessions();
            const r5Games = await getRound5Games();
            const r6State = targetRound >= 6 ? await getRound6State() : null;
            const r7State = targetRound >= 7 ? await getRound7State() : null;
            
            const teamsRes = await db.query(`
               SELECT t.id, t.name, t.round_formed, u1.name as user1_name, u2.name as user2_name, u1.id as user1_id, u2.id as user2_id, u1.is_eliminated as user1_eliminated, u2.is_eliminated as user2_eliminated
               FROM teams t JOIN users u1 ON t.user1_id = u1.id JOIN users u2 ON t.user2_id = u2.id ORDER BY t.id DESC
            `);

            for (const [uid, client] of clients.entries()) {
              if (client.socket.readyState === 1 && (client.user.role === 'admin' || client.user.role === 'volunteer')) {
                client.socket.send(JSON.stringify({ type: 'lottery_pool', pool }));
                client.socket.send(JSON.stringify({ type: 'round3_update', matches: r3Matches }));
                client.socket.send(JSON.stringify({ type: 'round4_sessions', sessions: r4Sessions }));
                client.socket.send(JSON.stringify({ type: 'round5_games', games: r5Games }));
                client.socket.send(JSON.stringify({ type: 'admin_teams', teams: teamsRes.rows }));
              }
              if (targetRound >= 6 && client.socket.readyState === 1) {
                client.socket.send(JSON.stringify({ type: 'round6_update', state: r6State }));
              }
              if (targetRound >= 7 && client.socket.readyState === 1) {
                client.socket.send(JSON.stringify({ type: 'round7_update', state: r7State }));
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
