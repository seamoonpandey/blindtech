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

function Round3PlayerView({ userId, matches, isEliminated, randomQuote }: { userId: string; matches: any[]; isEliminated: boolean; randomQuote: string }) {
  const myMatch = matches.find(m => 
    m.team1_user1 === userId || m.team1_user2 === userId || 
    m.team2_user1 === userId || m.team2_user2 === userId
  );

  const isTeam1 = myMatch && (myMatch.team1_user1 === userId || myMatch.team1_user2 === userId);

  return (
    <div className="match-view">
      <h2 className="section-title">ROUND 3: PHYSICAL TRIALS</h2>
      {isEliminated ? (
        <div className="eliminated-card" style={{ textAlign: 'center', padding: '3rem 0', background: 'rgba(255,0,0,0.05)', borderRadius: '12px', border: '2px solid #ff4444' }}>
          <div style={{ color: '#ff4444', fontSize: '4rem', fontWeight: 'bold', textShadow: '0 0 20px rgba(255,0,0,0.4)', marginBottom: '1rem' }}>TERMINATED</div>
          <h3 style={{ color: '#ff4444', fontSize: '1.5rem', marginBottom: '1.5rem' }}>YOU HAVE BEEN ELIMINATED</h3>
          <p style={{ fontStyle: 'italic', opacity: 0.8, fontSize: '1.1rem', maxWidth: '80%', margin: '0 auto' }}>"{randomQuote}"</p>
        </div>
      ) : (
        <div className="match-info">
          {myMatch && myMatch.status !== 'finished' && (
            <p style={{ marginBottom: '1rem', textAlign: 'center', opacity: 0.8 }}>Listen to the Volunteer Referee's instructions. 3 Rounds of physical trial.</p>
          )}
          
          {myMatch ? (
            <div className="my-match-section" style={{ marginBottom: '2rem' }}>
              {myMatch.status === 'finished' ? (
                <div className="outcome-section" style={{ textAlign: 'center', padding: '3rem 0', background: 'rgba(0,0,0,0.05)', borderRadius: '12px' }}>
                  {(() => {
                    const scores = isTeam1 ? myMatch.team1_scores : myMatch.team2_scores;
                    const positives = Array.isArray(scores) ? scores.filter((s: boolean) => s === true).length : 0;
                    const hasOpponent = !!myMatch.team2_id;
                    const isSafe = !hasOpponent || positives >= 2;
                    
                    return isSafe ? (
                      <div className="victory-announcement">
                        <div style={{ color: '#00ff00', fontSize: '4rem', fontWeight: 'bold', textShadow: '0 0 20px rgba(0,255,0,0.4)', marginBottom: '0.5rem' }}>VICTORY</div>
                        <h3 style={{ color: '#00ff00', fontSize: '1.5rem', marginBottom: '1.5rem' }}>DUEL COMPLETE: YOU ARE SAFE</h3>
                        <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '80%', margin: '0 auto 2rem' }}>Congratulations! You have survived the physical trials and advanced to the final stage.</p>
                        <div style={{ padding: '15px 30px', border: '2px solid #00ff00', color: '#00ff00', display: 'inline-block', fontWeight: 'bold', letterSpacing: '2px' }}>
                          STATUS: ACCESS GRANTED
                        </div>
                      </div>
                    ) : (
                      <div className="defeat-announcement">
                        <div style={{ color: '#ff4444', fontSize: '4rem', fontWeight: 'bold', textShadow: '0 0 20px rgba(255,0,0,0.4)', marginBottom: '0.5rem' }}>DEFEAT</div>
                        <h3 style={{ color: '#ff4444', fontSize: '1.5rem', marginBottom: '1.5rem' }}>DUEL TERMINATED: ELIMINATED</h3>
                        <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '80%', margin: '0 auto 2rem' }}>
                          {positives === 0 ? "Your team was disqualified or failed to secure a single win." : "You failed to secure enough wins to stay in the game."}
                        </p>
                        <div style={{ padding: '15px 30px', border: '2px solid #ff4444', color: '#ff4444', display: 'inline-block', fontWeight: 'bold', letterSpacing: '2px' }}>
                          STATUS: CONNECTION SEVERED
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="match-card active-duel" style={{ border: '4px solid #00ff00', background: '#f0fff0', borderRadius: '12px', overflow: 'hidden' }}>
                   <div className="match-header" style={{ padding: '1rem', background: '#e0ffe0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span>DUEL IN PROGRESS</span>
                      <span style={{ color: myMatch.status === 'active' ? '#00cc00' : '#888' }}>{myMatch.status.toUpperCase()}</span>
                   </div>
                   <div className="match-teams" style={{ padding: '2rem 1rem' }}>
                      <div className={`team-box ${isTeam1 ? 'my-team' : ''}`} style={isTeam1 ? { background: '#fff', border: '3px solid #00ff00', borderRadius: '12px', padding: '1.5rem' } : { padding: '1.5rem', opacity: 0.6 }}>
                         {isTeam1 && <div style={{ fontSize: '0.8rem', color: '#00cc00', fontWeight: 'bold', marginBottom: '0.5rem' }}>YOUR TEAM</div>}
                         <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{myMatch.team1_name}</div>
                         <div className="score-dots" style={{ marginTop: '1rem' }}>
                            {Array.isArray(myMatch.team1_scores) && myMatch.team1_scores.map((s: boolean, i: number) => (
                              <div key={i} className={`score-dot ${s ? 'plus' : 'minus'}`} style={{ width: '15px', height: '15px' }} />
                            ))}
                         </div>
                      </div>
                      <div className="vs-badge" style={{ fontSize: '2rem', fontWeight: 'black', opacity: 0.3 }}>VS</div>
                      <div className={`team-box ${!isTeam1 ? 'my-team' : ''}`} style={!isTeam1 ? { background: '#fff', border: '3px solid #00ff00', borderRadius: '12px', padding: '1.5rem' } : { padding: '1.5rem', opacity: 0.6 }}>
                         {!isTeam1 && <div style={{ fontSize: '0.8rem', color: '#00cc00', fontWeight: 'bold', marginBottom: '0.5rem' }}>YOUR TEAM</div>}
                         <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{myMatch.team2_name || 'LUCKY PASS'}</div>
                         <div className="score-dots" style={{ marginTop: '1rem' }}>
                            {Array.isArray(myMatch.team2_scores) && myMatch.team2_scores.map((s: boolean, i: number) => (
                              <div key={i} className={`score-dot ${s ? 'plus' : 'minus'}`} style={{ width: '15px', height: '15px' }} />
                            ))}
                         </div>
                      </div>
                   </div>
                   <div className="match-footer" style={{ textAlign: 'center', padding: '1.5rem', background: '#f9fff9', borderTop: '1px solid #e0ffe0' }}>
                     {myMatch.status === 'waiting' && <span style={{ fontWeight: 'bold', opacity: 0.6 }}>AWAITING REFEREE TO START...</span>}
                     {myMatch.status === 'active' && <span style={{ color: '#00cc00', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>SUBROUND {myMatch.current_subround}/3 LIVE</span>}
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ textAlign: 'center', padding: '4rem 2rem', border: '2px dashed #ccc', borderRadius: '12px' }}>
              <div className="loader-dots" style={{ marginBottom: '1.5rem' }}><span></span><span></span><span></span></div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>CALIBRATING DUELS</h3>
              <p style={{ opacity: 0.7 }}>Our algorithms are pairing you for the trials. Stand by.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Round3VolunteerView({ volunteerId, matches, onJoin, onScore, onDisqualify }: { volunteerId: string; matches: any[]; onJoin: (id: string) => void; onScore: (id: string, idx: 1 | 2, score: boolean) => void; onDisqualify: (id: string, idx: 1 | 2) => void }) {
  const myMatch = matches.find(m => m.volunteer_id === volunteerId && m.status === 'active');

  return (
    <div className="volunteer-round3" style={{ marginTop: '1rem' }}>
      <h2 className="section-title">ROUND 3: MATCH REFEREE</h2>
      {myMatch ? (
        <div className="match-card active-match" style={{ border: '4px solid #00ff00' }}>
          <div className="match-header">
            <span>ACTIVE DUEL - ROUND {myMatch.current_subround}/3</span>
          </div>
          <div className="match-teams">
            <div className="team-box">{myMatch.team1_name}</div>
            <div className="vs-badge">VS</div>
            <div className="team-box">{myMatch.team2_name || 'BYE'}</div>
          </div>
          
          <div className="scoring-controls">
            <div className="score-row">
              <span style={{ fontWeight: 'bold' }}>{myMatch.team1_name}</span>
              <div className="score-btns">
                <button 
                  className="score-btn minus" 
                  style={{ background: '#ffebeb', opacity: myMatch.team1_scores.length >= myMatch.current_subround ? 0.3 : 1 }} 
                  disabled={myMatch.team1_scores.length >= myMatch.current_subround}
                  onClick={() => onScore(myMatch.id, 1, false)}
                >-</button>
                <button 
                  className="score-btn plus" 
                  style={{ background: '#ebffeb', opacity: myMatch.team1_scores.length >= myMatch.current_subround ? 0.3 : 1 }} 
                  disabled={myMatch.team1_scores.length >= myMatch.current_subround}
                  onClick={() => onScore(myMatch.id, 1, true)}
                >+</button>
                <button 
                  className="score-btn dq" 
                  style={{ background: '#ff0000', color: 'white', fontSize: '0.6rem', padding: '0 5px', marginLeft: '5px' }}
                  onClick={() => onDisqualify(myMatch.id, 1)}
                >DQ</button>
              </div>
            </div>
            {myMatch.team2_id && (
              <div className="score-row">
                <span style={{ fontWeight: 'bold' }}>{myMatch.team2_name}</span>
                <div className="score-btns">
                  <button 
                    className="score-btn minus" 
                    style={{ background: '#ffebeb', opacity: myMatch.team2_scores.length >= myMatch.current_subround ? 0.3 : 1 }} 
                    disabled={myMatch.team2_scores.length >= myMatch.current_subround}
                    onClick={() => onScore(myMatch.id, 2, false)}
                  >-</button>
                  <button 
                    className="score-btn plus" 
                    style={{ background: '#ebffeb', opacity: myMatch.team2_scores.length >= myMatch.current_subround ? 0.3 : 1 }} 
                    disabled={myMatch.team2_scores.length >= myMatch.current_subround}
                    onClick={() => onScore(myMatch.id, 2, true)}
                  >+</button>
                  <button 
                    className="score-btn dq" 
                    style={{ background: '#ff0000', color: 'white', fontSize: '0.6rem', padding: '0 5px', marginLeft: '5px' }}
                    onClick={() => onDisqualify(myMatch.id, 2)}
                  >DQ</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="current-scores" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
             <div className="score-dots">
                {myMatch.team1_scores.map((s: boolean, i: number) => <div key={i} className={`score-dot ${s ? 'plus' : 'minus'}`} />)}
             </div>
             <div className="score-dots">
                {myMatch.team2_scores.map((s: boolean, i: number) => <div key={i} className={`score-dot ${s ? 'plus' : 'minus'}`} />)}
             </div>
          </div>
        </div>
      ) : (
        <div className="match-list">
          <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #ccc', paddingBottom: '0.5rem', fontWeight: 'bold' }}>DUEL MANAGEMENT LOBBY</h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            {matches.map(m => (
              <div key={m.id} className="match-card" style={{ border: m.status === 'active' ? '2px solid #00ff00' : '2px solid #ccc', opacity: m.status === 'finished' ? 0.6 : 1, background: m.status === 'finished' ? '#f5f5f5' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '0.8rem', opacity: 0.8 }}>
                  <span style={{ color: m.status === 'active' ? '#00cc00' : (m.status === 'finished' ? '#4444ff' : '#888') }}>{m.status.toUpperCase()}</span>
                  <span>{m.volunteer_name ? `Ref: ${m.volunteer_name}` : 'NO REFEREE'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{m.team1_name}</div>
                  <div style={{ opacity: 0.3, fontWeight: 'bold' }}>VS</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{m.team2_name || 'LUCKY PASS'}</div>
                </div>
                
                {m.status === 'waiting' && !m.volunteer_id && (
                  <button 
                    className="primary-btn" 
                    style={{ width: '100%', marginTop: '1rem', padding: '8px' }}
                    onClick={() => onJoin(m.id)}
                  >
                    VOLUNTEER AS REFEREE
                  </button>
                )}

                {m.status === 'finished' && (
                  <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#333', fontWeight: 'bold', padding: '5px', background: 'rgba(0,0,0,0.05)' }}>
                    {(() => {
                        const p1 = Array.isArray(m.team1_scores) ? m.team1_scores.filter((s:any)=>s===true).length : 0;
                        if (!m.team2_id) return 'LUCKY PASS - ADVANCED';
                        return p1 >= 2 ? `RESULT: ${m.team1_name} WON` : `RESULT: ${m.team2_name} WON`;
                    })()}
                  </div>
                )}

                {m.status === 'active' && m.volunteer_id !== volunteerId && (
                  <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6, fontStyle: 'italic' }}>
                    Currently being refereed...
                  </div>
                )}
              </div>
            ))}

            {matches.length === 0 && (
              <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                No duels have been created yet. Activate Round 3 to begin.
              </div>
            )}
          </div>
        </div>
      )}
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
  
  // Round 2 States
  const [lotteryPool, setLotteryPool] = useState<{id: string, is_taken: boolean, taken_by?: string, taken_by_name?: string, content_name?: string, team_name?: string}[]>([]);
  const [round2Role, setRound2Role] = useState<'leader' | 'selector' | null>(null);
  const [selectionResult, setSelectionResult] = useState<{type: 'team' | 'eliminated', partner?: string, quote?: string, teamName?: string} | null>(null);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [isEliminated, setIsEliminated] = useState(false);
  const [volunteerTab, setVolunteerTab] = useState<'round1' | 'round2' | 'round3'>('round1');
  const [round3Matches, setRound3Matches] = useState<any[]>([]);
  const [randomQuote] = useState(() => {
    const quotes = [
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
      "Segmentation fault (core dumped)."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  });

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
      console.log('WS MESSAGE RECEIVED:', data.type, data);
      if (data.type === 'init') {
        setGameState(data.state);
        setLeaderboard(data.leaderboard);
        setIsEliminated(data.isEliminated);
        if (data.submission) {
          setInitialSubmission(data.submission);
          setSubmitted(true);
        }
      } else if (data.type === 'state_update') {
        setGameState(data.state);
      } else if (data.type === 'leaderboard_update') {
        setLeaderboard(data.leaderboard);
      } else if (data.type === 'round_finished') {
        alert('END OF ROUND 1');
      } else if (data.type === 'lottery_pool') {
        setLotteryPool(data.pool);
      } else if (data.type === 'round2_role') {
        setRound2Role(data.role);
      } else if (data.type === 'card_taken') {
        setLotteryPool(prev => prev.map(c => c.id === data.cardId ? { ...c, is_taken: true, taken_by: data.taken_by } : c));
      } else if (data.type === 'selection_result') {
        setSelectionResult(data.result);
      } else if (data.type === 'duel_result') {
        if (data.result === 'disqualified') {
          alert('YOUR TEAM HAS BEEN DISQUALIFIED BY THE REFEREE.');
          setIsEliminated(true);
        } else if (data.result === 'won_by_dq') {
          alert('YOUR OPPONENT WAS DISQUALIFIED. YOU WIN THE MATCH!');
          setIsEliminated(false);
        }
      } else if (data.type === 'round3_init' || data.type === 'round3_update') {
        const matches = data.matches as any[];
        console.log('Updating Round 3 Matches:', matches);
        setRound3Matches(matches);
        
        // Check if current user is now eliminated based on match results
        if (user && user.role === 'player') {
          const myMatch = matches.find(m => 
            m.team1_user1 === user.id || m.team1_user2 === user.id || 
            m.team2_user1 === user.id || m.team2_user2 === user.id
          );
          if (myMatch && myMatch.status === 'finished') {
            const isTeam1 = myMatch.team1_user1 === user.id || myMatch.team1_user2 === user.id;
            const scores = isTeam1 ? myMatch.team1_scores : myMatch.team2_scores;
            const positives = Array.isArray(scores) ? scores.filter((s: boolean) => s === true).length : 0;
            if (positives < 2) {
               console.log('Setting isEliminated: TRUE (Positives < 2)');
               setIsEliminated(true);
            } else {
               console.log('Setting isEliminated: FALSE (Positives >= 2)');
               setIsEliminated(false);
            }
          }
        }
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

  const stopRound = () => {
    console.log('Sending stop_round message...');
    ws?.send(JSON.stringify({ type: 'stop_round' }));
  };

  const finishRound = () => {
    ws?.send(JSON.stringify({ type: 'finish_round' }));
  };

  const startRound2 = () => {
    ws?.send(JSON.stringify({ type: 'start_round_2' }));
  };

  const startRound3 = () => {
    ws?.send(JSON.stringify({ type: 'start_round_3' }));
  };

  const joinMatch = (matchId: string) => {
    ws?.send(JSON.stringify({ type: 'join_match', matchId }));
  };

  const scoreTeam = (matchId: string, teamIndex: 1 | 2, score: boolean) => {
    ws?.send(JSON.stringify({ type: 'score_team', matchId, teamIndex, score }));
  };

  const disqualifyTeam = (matchId: string, teamIndex: 1 | 2) => {
    console.log(`Attempting to disqualify match ${matchId} team ${teamIndex}`);
    if (window.confirm("ARE YOU SURE? This will instantly ELIMINATE the team and pass their opponent.")) {
      console.log("Calling DQ API...");
      fetch('http://127.0.0.1:3000/round3/disqualify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ matchId, teamIndex })
      })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to disqualify');
        }
        return res.json();
      })
      .then(data => {
        console.log('DQ API Success:', data);
        // Optimistic update for immediate feedback
        setRound3Matches(prev => prev.map(m => {
            if (m.id === matchId) {
                const team1_scores = teamIndex === 1 ? [false,false,false] : [true,true,true];
                const team2_scores = teamIndex === 2 ? [false,false,false] : [true,true,true];
                return { ...m, status: 'finished', team1_scores, team2_scores };
            }
            return m;
        }));
      })
      .catch(err => {
        console.error('DQ API Error:', err);
        alert(`Error: ${err.message}`);
      });
    }
  };

  const selectCard = (cardId: string) => {
    setPendingCardId(cardId);
  };

  const confirmSelection = () => {
    if (pendingCardId) {
      ws?.send(JSON.stringify({ type: 'select_card', cardId: pendingCardId }));
      setPendingCardId(null);
    }
  };

  const cancelSelection = () => {
    setPendingCardId(null);
  };

  const togglePlayer = (player: Player) => {
    if (selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      if (selectedPlayers.length >= 10) {
        alert('MISSION LIMIT REACHED: MAXIMUM 10 TARGETS ALLOWED.');
        return;
      }
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
        {(user.role === 'volunteer' || gameState.current_round <= 1) && (
          <button 
            className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            {user.role === 'volunteer' ? 'DATA' : 'RANKINGS'}
          </button>
        )}
      </div>

      <div className="game-layout">
        {/* Left Column: Game Interaction */}
        <div className={`main-area ${activeTab === 'game' ? 'show' : 'hide'}`}>
          {user.role === 'volunteer' && gameState.status === 'waiting' && gameState.current_round === 0 && (
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
                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{selectedPlayers.length} / 10 SELECTED</span>
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

          {gameState.status === 'active' && user.role === 'volunteer' && gameState.current_round === 1 && (
            <div className="card admin-card">
              <h2 className="section-title">ROUND 1 ACTIVE</h2>
              <p>Players are currently submitting their rankings.</p>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{players.length}</div>
                  <div className="stat-label">TOTAL PLAYERS</div>
                </div>
              </div>
              <button 
                onClick={finishRound} 
                className="submit-btn" 
                style={{ width: '100%', marginTop: '1.5rem' }}
              >
                FINISH ROUND
              </button>
              <button 
                onClick={stopRound} 
                className="secondary-btn" 
                style={{ width: '100%', marginTop: '0.5rem', background: '#ff4444', color: 'white' }}
              >
                STOP ROUND
              </button>
            </div>
          )}

          {gameState.status === 'active' && user.role === 'player' && gameState.current_round === 3 && (
            <Round3PlayerView 
              userId={user.id} 
              matches={round3Matches} 
              isEliminated={isEliminated}
              randomQuote={randomQuote}
            />
          )}

          {gameState.status === 'active' && user.role === 'volunteer' && gameState.current_round === 3 && (
            <Round3VolunteerView 
              volunteerId={user.id}
              matches={round3Matches}
              onJoin={joinMatch}
              onScore={scoreTeam}
              onDisqualify={disqualifyTeam}
            />
          )}

          {gameState.status === 'finished' && (
            <div className="card finished-card">
              <div className="loader-dots">
                <span></span><span></span><span></span>
              </div>
              <h2 className="section-title">ROUND {gameState.current_round} COMPLETE</h2>
              {user.role === 'player' ? (
                <>
                  {isEliminated ? (
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4444', marginBottom: '1rem' }}>
                        OOPSIE!
                      </p>
                      <p style={{ fontStyle: 'italic', fontSize: '1.1rem', opacity: 0.8, marginBottom: '1.5rem' }}>
                        "{randomQuote}"
                      </p>
                      <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                        You are eliminated and cannot continue.
                      </p>
                      <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff4444' }}>
                        GET OUT AND GO TO THE NEXT ROOM.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '1rem', color: '#00ff00' }}>
                        CONGRATULATIONS ON COMPLETING THAT BITCHY ROUND.
                      </p>
                      <p style={{ opacity: 0.7, marginTop: '0.5rem' }}>
                        Commencing to Round {gameState.current_round + 1}... Hold your seats.
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '1rem' }}>
                    ROUND {gameState.current_round} FINALIZED
                  </p>
                  <p style={{ opacity: 0.7 }}>Awaiting next phase instructions...</p>
                  {user.role === 'volunteer' && gameState.current_round === 1 && (
                    <button 
                      onClick={startRound2} 
                      className="submit-btn" 
                      style={{ width: '100%', marginTop: '1.5rem' }}
                    >
                      ACTIVATE ROUND 2
                    </button>
                  )}
                  {user.role === 'volunteer' && gameState.current_round === 2 && (
                    <button 
                      onClick={startRound3} 
                      className="submit-btn" 
                      style={{ width: '100%', marginTop: '1.5rem' }}
                    >
                      ACTIVATE ROUND 3
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {gameState.current_round === 2 && gameState.status === 'active' && (
            <div className="round2-container">
              {round2Role === 'leader' ? (
                <div className="card leader-card">
                  {selectionResult ? (
                    <div className="selection-result" style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>TEAM FORMED!</h3>
                      <p>Your permanent partner is:</p>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00', textShadow: '0 0 10px rgba(0,255,0,0.5)', marginBottom: '1.5rem' }}>
                        {selectionResult.partner}
                      </p>
                      {selectionResult.teamName && (
                        <div className="team-badge" style={{ display: 'inline-block', padding: '0.5rem 1rem', border: '2px solid #00ff00', color: '#00ff00', fontWeight: 'bold', fontSize: '1.2rem' }}>
                          {selectionResult.teamName.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="loader-dots">
                        <span></span><span></span><span></span>
                      </div>
                      <h2 className="section-title">ROUND 2: LOTTERY</h2>
                      <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '1rem' }}>YOU ARE A LEADER</p>
                      <p style={{ opacity: 0.7 }}>Wait till someone chooses you...</p>
                    </>
                  )}
                </div>
              ) : user.role === 'player' ? (
                <div className="card selector-card">
                  <h2 className="section-title">ROUND 2: LOTTERY</h2>
                  {selectionResult ? (
                    <div className="selection-result" style={{ textAlign: 'center', padding: '2rem 0' }}>
                      {selectionResult.type === 'team' ? (
                        <>
                          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>TEAM FORMED!</h3>
                          <p>Your permanent partner is:</p>
                          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff00', textShadow: '0 0 10px rgba(0,255,0,0.5)', marginBottom: '1.5rem' }}>
                            {selectionResult.partner}
                          </p>
                          {selectionResult.teamName && (
                            <div className="team-badge" style={{ display: 'inline-block', padding: '0.5rem 1rem', border: '2px solid #00ff00', color: '#00ff00', fontWeight: 'bold', fontSize: '1.2rem' }}>
                              {selectionResult.teamName.toUpperCase()}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ff4444' }}>ELIMINATED</h3>
                          <p className="quote" style={{ fontStyle: 'italic', fontSize: '1.2rem', opacity: 0.8 }}>
                            "{selectionResult.quote}"
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <p style={{ marginBottom: '1.5rem' }}>Select a card to find your partner or your fate.</p>
                      <div className="card-grid">
                        {lotteryPool.map(card => (
                          <div 
                            key={card.id} 
                            className={`lottery-card ${card.is_taken ? 'taken' : ''}`}
                            onClick={() => !card.is_taken && selectCard(card.id)}
                          >
                            <div className="card-inner">
                              <div className="card-front">?</div>
                              <div className="card-back">{card.is_taken ? '×' : ''}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}


          {gameState.current_round === 2 && gameState.status === 'active' && user.role === 'volunteer' && (
            <div className="card admin-card">
              <h2 className="section-title">ROUND 2 ACTIVE</h2>
              <p>Lottery is in progress. Leaders are waiting, Selectors are picking.</p>
              <button 
                onClick={stopRound} 
                className="secondary-btn" 
                style={{ width: '100%', marginTop: '1.5rem', background: '#ff4444', color: 'white' }}
              >
                STOP ROUND 2 & ELIMINATE SINGLES
              </button>
            </div>
          )}
        </div>

        {pendingCardId && (
          <div className="modal-overlay">
            <div className="card modal-card">
              <h2 className="section-title">CONFIRM SELECTION</h2>
              <p style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                Are you sure you want to select this card? This action is permanent and will determine your fate.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={cancelSelection} 
                  className="secondary-btn" 
                  style={{ flex: 1 }}
                >
                  CANCEL
                </button>
                <button 
                  onClick={confirmSelection} 
                  className="primary-btn" 
                  style={{ flex: 1 }}
                >
                  CONFIRM
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Leaderboard / Volunteer Data */}
        {(user.role === 'volunteer' || gameState.current_round <= 1) && (
          <div className={`sidebar ${activeTab === 'leaderboard' ? 'show' : 'hide'}`}>
            <div className="card leaderboard-card">
              {user.role === 'volunteer' ? (
                <>
                  <div className="volunteer-tabs">
                    <button 
                      className={`v-tab ${volunteerTab === 'round1' ? 'active' : ''}`}
                      onClick={() => setVolunteerTab('round1')}
                    >
                      R1
                    </button>
                    <button 
                      className={`v-tab ${volunteerTab === 'round2' ? 'active' : ''}`}
                      onClick={() => setVolunteerTab('round2')}
                    >
                      R2
                    </button>
                    <button 
                      className={`v-tab ${volunteerTab === 'round3' ? 'active' : ''}`}
                      onClick={() => setVolunteerTab('round3')}
                    >
                      R3
                    </button>
                  </div>

                  {volunteerTab === 'round1' && (
                    <>
                      <h2 className="section-title">R1 RANKINGS</h2>
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
                    </>
                  )}

                  {volunteerTab === 'round2' && (
                    <>
                      <h2 className="section-title">R2 STATUS</h2>
                      <div className="volunteer-data-list">
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem' }}>
                          Real-time lottery results will appear here.
                        </p>
                        {lotteryPool.filter(c => c.is_taken && c.content_name !== 'QUOTE').length === 0 ? (
                          <p>No teams formed yet.</p>
                        ) : (
                          <div className="data-items">
                            {lotteryPool.filter(c => c.is_taken && c.content_name !== 'QUOTE').map(card => (
                              <div key={card.id} className="data-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                  <span className="data-user">{card.taken_by_name || 'Unknown'}</span>
                                  <span className="data-arrow">→</span>
                                  <span className="data-result">{card.content_name || 'Picked'}</span>
                                </div>
                                {card.team_name && (
                                  <div style={{ fontSize: '0.75rem', color: '#00ff00', marginTop: '0.2rem', fontWeight: 'bold' }}>
                                    TEAM: {card.team_name}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                   {volunteerTab === 'round3' && (
                    <>
                      <h2 className="section-title">R3 STATUS</h2>
                      <div className="volunteer-data-list">
                        <div className="data-items">
                          {round3Matches.map(m => {
                            const isFinished = m.status === 'finished';
                            const getStatusColor = (scores: any, isLuckyPassSlot: boolean, hasOpponent: boolean) => {
                              if (!isFinished) return 'inherit';
                              if (isLuckyPassSlot) return '#888'; // Neutral grey for the placeholder
                              if (!hasOpponent) return '#00cc00'; // Solo team with Lucky Pass is always safe
                              const s = Array.isArray(scores) ? scores : [];
                              const positives = s.filter((val: any) => val === true).length;
                              return positives >= 2 ? '#00cc00' : '#ff4444';
                            };

                            return (
                              <div key={m.id} className="data-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <span style={{ color: getStatusColor(m.team1_scores, false, !!m.team2_id) }}>{m.team1_name}</span>
                                      {(m.status === 'active' || m.status === 'waiting') && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); disqualifyTeam(m.id, 1); }}
                                          style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.6rem', cursor: 'pointer', marginLeft: '4px', padding: '0 2px', borderBottom: '1px solid #ff4444' }}
                                        >DQ</button>
                                      )}
                                    </div>
                                    <span style={{ opacity: 0.4 }}>vs</span>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <span style={{ color: getStatusColor(m.team2_scores, !m.team2_id, !!m.team2_id) }}>{m.team2_name || 'LUCKY PASS'}</span>
                                      {(m.status === 'active' || m.status === 'waiting') && m.team2_id && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); disqualifyTeam(m.id, 2); }}
                                          style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.6rem', cursor: 'pointer', marginLeft: '4px', padding: '0 2px', borderBottom: '1px solid #ff4444' }}
                                        >DQ</button>
                                      )}
                                    </div>
                                  </div>
                                  <span style={{ color: m.status === 'active' ? '#00ff00' : (m.status === 'finished' ? '#4444ff' : '#888'), fontSize: '0.7rem' }}>{m.status.toUpperCase()}</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.2rem' }}>
                                  Ref: {m.volunteer_name || 'NONE'} | Subround: {m.current_subround}/3
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        )}
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

        .admin-card {
          border: 2px solid #ff4444;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-card {
          max-width: 400px;
          width: 100%;
          animation: modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .volunteer-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid black;
          padding-bottom: 0.5rem;
        }

        .v-tab {
          flex: 1;
          background: white;
          border: 2px solid black;
          padding: 0.3rem;
          font-family: 'Courier New', Courier, monospace;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }

        .v-tab.active {
          background: black;
          color: white;
        }

        .volunteer-data-list {
          padding: 0.5rem;
        }

        .data-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .data-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border: 1px solid #eee;
          font-size: 0.9rem;
        }

        .data-user {
          font-weight: bold;
          flex: 1;
        }

        .data-arrow {
          opacity: 0.5;
        }

        .data-result {
          color: #ff4444;
          font-weight: bold;
        }

        @keyframes modal-pop {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
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
          opacity: 0.7;
        }

        /* Round 2 Styles */
        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
          gap: 10px;
          margin-top: 1rem;
        }

        /* Round 3 Styles */
        .match-card {
          border: 3px solid black;
          padding: 1rem;
          margin-bottom: 1rem;
          background: white;
          box-shadow: 4px 4px 0px 0px black;
        }

        .match-header {
          display: flex;
          justify-content: space-between;
          font-weight: 900;
          border-bottom: 2px solid black;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }

        .match-teams {
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 1rem;
        }

        .team-box {
          flex: 1;
          text-align: center;
        }

        .score-dots {
          display: flex;
          gap: 4px;
          justify-content: center;
          margin-top: 0.5rem;
        }

        .score-dot {
          width: 8px;
          height: 8px;
          border: 1px solid black;
          border-radius: 50%;
        }

        .score-dot.plus { background: #00ff00; }
        .score-dot.minus { background: #ff4444; }

        .vs-badge {
          background: black;
          color: white;
          padding: 0.2rem 0.5rem;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .scoring-controls {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .score-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: space-between;
        }

        .score-btns {
          display: flex;
          gap: 0.5rem;
        }

        .score-btn {
          width: 40px;
          height: 40px;
          border: 2px solid black;
          font-weight: 900;
          cursor: pointer;
          background: white;
          box-shadow: 2px 2px 0px 0px black;
        }

        .score-btn.plus:hover { background: #00ff00; }
        .score-btn.minus:hover { background: #ff4444; }
        .score-btn:active { transform: translate(1px, 1px); box-shadow: 1px 1px 0px 0px black; }

        .lottery-card {
          aspect-ratio: 2/3;
          perspective: 1000px;
          cursor: pointer;
        }

        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          border: 2px solid #000;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .lottery-card.taken .card-inner {
          background: #eee;
          color: #ccc;
          cursor: not-allowed;
        }

        .lottery-card:not(.taken):hover .card-inner {
          background: #000;
          color: #fff;
          transform: translateY(-5px);
          box-shadow: 4px 4px 0 #000;
        }

        .card-front, .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-back {
          transform: rotateY(180deg);
        }

        .selection-result h3 {
          letter-spacing: 2px;
        }

        @media (max-width: 600px) {
          .card-grid {
            grid-template-columns: repeat(4, 1fr);
          }
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

        .entry-info {
          flex: 1;
        }

        .entry-name {
          font-weight: bold;
          font-size: 0.85rem;
          margin-bottom: 2px;
        }

        .entry-bar-bg {
          height: 4px;
          background: #eee;
          border: 1px solid black;
        }

        .entry-bar-fill {
          height: 100%;
          background: black;
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
