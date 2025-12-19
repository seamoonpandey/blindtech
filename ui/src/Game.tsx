import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function SortablePlayer({ player, index, isLast, onMove, onRemove }: { player: Player; index: number; isLast: boolean; onMove: (index: number, direction: 'up' | 'down') => void; onRemove: (player: Player) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`ranked-item ${isDragging ? 'dragging' : ''}`}>
      <div className="drag-handle" {...attributes} {...listeners}>
        <svg viewBox="0 0 20 20" width="20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" fill="currentColor"></path>
        </svg>
      </div>
      <div className="rank-num">{index + 1}</div>
      <div className="rank-name">{player.name}</div>
      <div className="rank-controls">
        <button onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }} disabled={index === 0}>↑</button>
        <button onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }} disabled={isLast}>↓</button>
        <button onClick={(e) => { e.stopPropagation(); onRemove(player); }} style={{ background: '#ff4444', color: 'white' }}>×</button>
      </div>
    </div>
  );
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
  const [initialSubmission, setInitialSubmission] = useState<{target_id: string, rank: number}[] | null>(null);
  const [activeTab, setActiveTab] = useState<'game' | 'leaderboard'>('game');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        if (data.submission) {
          setInitialSubmission(data.submission);
          setSubmitted(true);
        }
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

  // Sync initial submission with players list
  useEffect(() => {
    if (players.length > 0 && initialSubmission) {
      const mapped = initialSubmission
        .sort((a, b) => a.rank - b.rank)
        .map(s => players.find(p => p.id === s.target_id))
        .filter((p): p is Player => !!p);
      setSelectedPlayers(mapped);
      // Only do this once
      setInitialSubmission(null);
    }
  }, [players, initialSubmission]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedPlayers((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
    <div className="container" style={{ maxWidth: '1200px', padding: '10px' }}>
      <div className="nav">
        <div className="logo">BLINDTECH.EXE</div>
        <div className="user-info">
          <div className="user-meta">
            <div className="user-name">{user.name.toUpperCase()}</div>
            <div className="user-role">{user.role.toUpperCase()}</div>
          </div>
          <button onClick={logout} className="exit-btn">EXIT</button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="mobile-tabs">
        <button 
          className={`tab-btn ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          MISSION
        </button>
        <button 
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          RANKINGS
        </button>
      </div>

      <div className="game-layout">
        {/* Left Column: Game Interaction */}
        <div className={`main-area ${activeTab === 'game' ? 'show' : 'hide'}`}>
          {user.role === 'volunteer' && gameState.status === 'waiting' && (
            <div className="card admin-card">
              <h2 className="section-title">CONTROL PANEL</h2>
              <p>Initialize Round 1 for all players.</p>
              <button onClick={startRound} className="primary-btn" style={{ width: '100%', fontSize: '1.2rem' }}>
                ACTIVATE ROUND 1
              </button>
            </div>
          )}

          {gameState.current_round === 1 && gameState.status === 'active' && user.role === 'player' && (
            <div className="card interaction-card">
              <h2 className="section-title">ROUND 1: POPULARITY HELL</h2>
              {!submitted ? (
                <>
                  <div className="instruction-box">
                    <p><strong>MISSION:</strong> Select and rank players. Mutual selections grant massive bonuses.</p>
                  </div>
                  
                  <div className="selection-grid">
                    <div className="player-pool">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h3>TARGETS</h3>
                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{selectedPlayers.length} SELECTED</span>
                      </div>
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
                      <p style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: '0.5rem' }}>DRAG TO REORDER</p>
                      {selectedPlayers.length > 0 ? (
                        <div className="ranked-list">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={selectedPlayers.map(p => p.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {selectedPlayers.map((p, i) => (
                                <SortablePlayer 
                                  key={p.id} 
                                  player={p} 
                                  index={i} 
                                  isLast={i === selectedPlayers.length - 1}
                                  onMove={movePlayer}
                                  onRemove={togglePlayer}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                          <button onClick={submitRanking} className="submit-btn">
                            FINALIZE
                          </button>
                          <button 
                            onClick={() => setSelectedPlayers([])} 
                            className="secondary-btn"
                            style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.8rem', padding: '8px' }}
                          >
                            CLEAR ALL
                          </button>
                        </div>
                      ) : (
                        <div className="empty-state">
                          Select players to start ranking.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="submitted-state">
                  <div className="success-icon">✓</div>
                  <h3>TRANSMISSION COMPLETE</h3>
                  <p>Your rankings have been recorded.</p>
                  <button 
                    onClick={() => setSubmitted(false)} 
                    className="secondary-btn"
                    style={{ marginTop: '2rem' }}
                  >
                    CHANGE RANKING
                  </button>
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
              <p>Awaiting authorization...</p>
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
        <div className={`sidebar ${activeTab === 'leaderboard' ? 'show' : 'hide'}`}>
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
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 10px 0;
          border-bottom: 3px solid black;
        }

        .logo {
          font-weight: 900;
          font-size: 1.2rem;
          letter-spacing: -1px;
        }

        @media (min-width: 768px) {
          .logo {
            font-size: 1.8rem;
          }
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .user-meta {
          text-align: left;
          display: none;
        }

        @media (min-width: 480px) {
          .user-meta {
            display: block;
          }
        }

        .user-name {
          font-weight: bold;
          font-size: 0.8rem;
        }

        .user-role {
          font-size: 0.6rem;
          opacity: 0.7;
        }

        .exit-btn {
          padding: 5px 10px;
          font-size: 0.7rem;
        }

        .mobile-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 1.5rem;
        }

        @media (min-width: 800px) {
          .mobile-tabs {
            display: none;
          }
        }

        .tab-btn {
          padding: 12px;
          font-weight: 900;
          background: white;
          border: 3px solid black;
          box-shadow: 4px 4px 0px 0px black;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .tab-btn.active {
          background: black;
          color: white;
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px black;
        }

        .game-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        @media (min-width: 800px) {
          .game-layout {
            grid-template-columns: 1fr 350px;
          }
        }

        .section-title {
          font-size: 1.1rem;
          margin-bottom: 1rem;
          border-bottom: 3px solid black;
          display: inline-block;
          padding-bottom: 2px;
        }

        .instruction-box {
          background: #000;
          color: #fff;
          padding: 0.8rem;
          margin-bottom: 1.5rem;
          border: 3px solid black;
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .selection-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 600px) {
          .selection-grid {
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }
        }

        .player-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          max-height: 40vh;
          overflow-y: auto;
          padding-right: 5px;
        }

        .player-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 2px solid black;
          cursor: pointer;
          font-weight: bold;
          font-size: 0.8rem;
          transition: all 0.1s;
        }

        .player-item:hover {
          transform: translate(-1px, -1px);
          box-shadow: 2px 2px 0px 0px black;
        }

        .player-item.selected {
          background: black;
          color: white;
        }

        .ranked-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          max-height: 40vh;
          overflow-y: auto;
        }

        .ranked-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 10px;
          border: 2px solid black;
          background: #f8f8f8;
          user-select: none;
          font-size: 0.8rem;
        }

        .ranked-item.dragging {
          background: #eee;
          box-shadow: 4px 4px 0px 0px black;
          opacity: 0.8;
        }

        .drag-handle {
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #888;
          padding: 4px;
          touch-action: none;
        }

        .rank-num {
          font-weight: 900;
          width: 20px;
          font-size: 0.9rem;
        }

        .rank-name {
          flex: 1;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rank-controls {
          display: flex;
          gap: 2px;
        }

        .rank-controls button {
          padding: 4px 8px;
          box-shadow: 1px 1px 0px 0px black;
          font-size: 0.7rem;
        }

        .submit-btn {
          margin-top: 1.5rem;
          background: #00ff00;
          font-size: 1.1rem;
          padding: 15px;
          font-weight: 900;
          width: 100%;
          box-shadow: 4px 4px 0px 0px black;
        }

        .submit-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px black;
        }

        .secondary-btn {
          background: white;
          border: 3px solid black;
          padding: 12px 24px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 4px 4px 0px 0px black;
          width: 100%;
        }

        @media (min-width: 480px) {
          .secondary-btn {
            width: auto;
          }
        }

        .empty-state {
          border: 2px dashed #ccc;
          padding: 2rem;
          text-align: left;
          color: #888;
          font-size: 0.8rem;
          font-style: italic;
        }

        .submitted-state {
          text-align: left;
          padding: 2rem 0;
        }

        .stat-item {
          text-align: left;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 900;
        }

        .stat-label {
          font-size: 0.7rem;
          font-weight: bold;
          opacity: 0.7;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 10px;
          border: 2px solid black;
          background: white;
        }

        .entry-rank {
          font-size: 1.2rem;
          font-weight: 900;
          width: 30px;
          text-align: center;
        }

        .entry-name {
          font-weight: bold;
          font-size: 0.85rem;
          margin-bottom: 2px;
        }

        .entry-score {
          font-size: 1rem;
          font-weight: bold;
          min-width: 50px;
          text-align: right;
        }

        .rank-1 { background: #ffd700; }
        .rank-2 { background: #c0c0c0; }
        .rank-3 { background: #cd7f32; }

        .main-area.hide, .sidebar.hide {
          display: none;
        }

        @media (min-width: 800px) {
          .main-area.hide, .sidebar.hide {
            display: block;
          }
        }

        .loader-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 1rem;
        }

        .loader-dots span {
          width: 12px;
          height: 12px;
          background: black;
          border-radius: 50%;
          animation: bounce 0.5s infinite alternate;
        }

        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
