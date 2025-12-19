import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

interface Player {
  id: string;
  name: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
}

interface GameState {
  current_round: number;
  status: 'waiting' | 'active' | 'finished';
}

export default function Game() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const socket = new WebSocket('ws://localhost:3000/ws');
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', token }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init') {
        setGameState(data.state);
        setLeaderboard(data.leaderboard);
      } else if (data.type === 'state_update') {
        setGameState(data.state);
      } else if (data.type === 'leaderboard_update') {
        setLeaderboard(data.leaderboard);
      }
    };

    setWs(socket);

    // Fetch players
    fetch('http://127.0.0.1:3000/players', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPlayers(data);
      })
      .catch(err => console.error('Failed to fetch players:', err));

    return () => {
      socket.close();
    };
  }, [user, navigate, token]);

  const startRound = () => {
    ws?.send(JSON.stringify({ type: 'start_round' }));
  };

  const togglePlayer = (player: Player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const newSelected = [...selectedPlayers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSelected.length) return;
    
    const temp = newSelected[index];
    newSelected[index] = newSelected[targetIndex];
    newSelected[targetIndex] = temp;
    setSelectedPlayers(newSelected);
  };

  const submitRanking = () => {
    const payload = selectedPlayers.map((p, i) => ({
      target_id: p.id,
      rank: i + 1
    }));
    ws?.send(JSON.stringify({ type: 'submit_ranking', payload }));
    setSubmitted(true);
  };

  if (!user || !gameState) return <div className="container">Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      <div className="nav">
        <div style={{ fontWeight: 'bold', fontSize: '2rem', letterSpacing: '-2px' }}>BLINDTECH.EXE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold' }}>{user.name.toUpperCase()}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>ROLE: {user.role.toUpperCase()}</div>
          </div>
          <button onClick={logout} style={{ padding: '5px 15px' }}>EXIT</button>
        </div>
      </div>

      <div className="game-layout">
        {/* Left Column: Game Interaction */}
        <div className="main-area">
          {user.role === 'volunteer' && gameState.status === 'waiting' && (
            <div className="card admin-card">
              <h2 className="section-title">CONTROL PANEL</h2>
              <p>Initialize Round 1 for all players.</p>
              <button onClick={startRound} className="primary-btn" style={{ width: '100%', fontSize: '1.2rem' }}>
                ACTIVATE ROUND 1: POPULARITY HELL
              </button>
            </div>
          )}

          {gameState.current_round === 1 && gameState.status === 'active' && user.role === 'player' && (
            <div className="card interaction-card">
              <h2 className="section-title">ROUND 1: POPULARITY HELL</h2>
              {!submitted ? (
                <>
                  <div className="instruction-box">
                    <p><strong>MISSION:</strong> Select players you want to keep in the game. Your ranking affects their score. Mutual selections grant massive bonuses.</p>
                  </div>
                  
                  <div className="selection-grid">
                    <div className="player-pool">
                      <h3>AVAILABLE TARGETS</h3>
                      <div className="player-list">
                        {players.map(p => {
                          const isSelected = selectedPlayers.find(sp => sp.id === p.id);
                          return (
                            <div 
                              key={p.id} 
                              className={`player-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => togglePlayer(p)}
                            >
                              <span className="player-name">{p.name}</span>
                              <span className="player-status">{isSelected ? '✓' : '+'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="ranking-area">
                      <h3>YOUR RANKING</h3>
                      {selectedPlayers.length > 0 ? (
                        <div className="ranked-list">
                          {selectedPlayers.map((p, i) => (
                            <div key={p.id} className="ranked-item">
                              <div className="rank-num">{i + 1}</div>
                              <div className="rank-name">{p.name}</div>
                              <div className="rank-controls">
                                <button onClick={(e) => { e.stopPropagation(); movePlayer(i, 'up'); }} disabled={i === 0}>↑</button>
                                <button onClick={(e) => { e.stopPropagation(); movePlayer(i, 'down'); }} disabled={i === selectedPlayers.length - 1}>↓</button>
                              </div>
                            </div>
                          ))}
                          <button onClick={submitRanking} className="submit-btn">
                            FINALIZE SUBMISSION
                          </button>
                        </div>
                      ) : (
                        <div className="empty-state">
                          Select players from the left to start ranking.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="submitted-state">
                  <div className="success-icon">✓</div>
                  <h3>TRANSMISSION COMPLETE</h3>
                  <p>Your rankings have been recorded. Awaiting final results.</p>
                </div>
              )}
            </div>
          )}

          {gameState.status === 'waiting' && user.role === 'player' && (
            <div className="card waiting-card">
              <div className="loader-dots">
                <span></span><span></span><span></span>
              </div>
              <h2 className="section-title">SYSTEM STANDBY</h2>
              <p>Awaiting authorization from Game Master...</p>
            </div>
          )}

          {gameState.status === 'active' && user.role === 'volunteer' && (
            <div className="card admin-card">
              <h2 className="section-title">ROUND 1 ACTIVE</h2>
              <p>Players are currently submitting their rankings.</p>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{players.length}</div>
                  <div className="stat-label">TOTAL PLAYERS</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Leaderboard */}
        <div className="sidebar">
          <div className="card leaderboard-card">
            <h2 className="section-title">LIVE RANKINGS</h2>
            <div className="leaderboard-container">
              {leaderboard.length === 0 ? (
                <div className="empty-leaderboard">
                  <p>INITIALIZING DATA...</p>
                </div>
              ) : (
                <div className="leaderboard-list">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.id} className={`leaderboard-item rank-${i + 1}`}>
                      <div className="entry-rank">{i + 1}</div>
                      <div className="entry-info">
                        <div className="entry-name">{entry.name}</div>
                        <div className="entry-bar-bg">
                          <div 
                            className="entry-bar-fill" 
                            style={{ width: `${Math.min(100, (entry.score / (leaderboard[0].score || 1)) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="entry-score">{entry.score}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .game-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
          align-items: start;
        }

        @media (max-width: 1000px) {
          .game-layout {
            grid-template-columns: 1fr;
          }
          .sidebar {
            order: -1;
          }
        }

        .section-title {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 3px solid black;
          display: inline-block;
          padding-bottom: 5px;
        }

        .instruction-box {
          background: #000;
          color: #fff;
          padding: 1rem;
          margin-bottom: 2rem;
          border: 3px solid black;
          box-shadow: 4px 4px 0px 0px #888;
        }

        .selection-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .player-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 10px;
        }

        .player-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          border: 3px solid black;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.1s;
        }

        .player-item:hover {
          transform: translate(-2px, -2px);
          box-shadow: 4px 4px 0px 0px black;
        }

        .player-item.selected {
          background: black;
          color: white;
        }

        .ranked-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ranked-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 10px;
          border: 3px solid black;
          background: #f8f8f8;
        }

        .rank-num {
          font-size: 1.2rem;
          font-weight: 900;
          width: 30px;
        }

        .rank-name {
          flex: 1;
          font-weight: bold;
        }

        .rank-controls button {
          padding: 2px 8px;
          margin: 0 2px;
          box-shadow: 2px 2px 0px 0px black;
          font-size: 0.8rem;
        }

        .rank-controls button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          box-shadow: none;
        }

        .submit-btn {
          margin-top: 1rem;
          background: #00ff00;
          font-size: 1.1rem;
          padding: 15px;
        }

        .empty-state {
          border: 3px dashed #ccc;
          padding: 3rem;
          text-align: center;
          color: #888;
          font-style: italic;
        }

        .submitted-state {
          text-align: center;
          padding: 4rem 2rem;
        }

        .success-icon {
          font-size: 5rem;
          margin-bottom: 1rem;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 10px;
          border: 3px solid black;
          background: white;
          transition: transform 0.2s;
        }

        .leaderboard-item:hover {
          transform: scale(1.02);
        }

        .entry-rank {
          font-size: 1.5rem;
          font-weight: 900;
          width: 40px;
          text-align: center;
        }

        .entry-info {
          flex: 1;
        }

        .entry-name {
          font-weight: bold;
          margin-bottom: 4px;
        }

        .entry-bar-bg {
          height: 8px;
          background: #eee;
          border: 1px solid black;
        }

        .entry-bar-fill {
          height: 100%;
          background: black;
          transition: width 0.5s ease-out;
        }

        .entry-score {
          font-size: 1.2rem;
          font-weight: bold;
          min-width: 60px;
          text-align: right;
        }

        .rank-1 { background: #ffd700; }
        .rank-2 { background: #c0c0c0; }
        .rank-3 { background: #cd7f32; }

        .loader-dots {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 1rem;
        }

        .loader-dots span {
          width: 15px;
          height: 15px;
          background: black;
          border-radius: 50%;
          animation: bounce 0.5s infinite alternate;
        }

        .loader-dots span:nth-child(2) { animation-delay: 0.1s; }
        .loader-dots span:nth-child(3) { animation-delay: 0.2s; }

        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
