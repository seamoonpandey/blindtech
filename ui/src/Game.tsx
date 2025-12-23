import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_URL, WS_URL } from './config';
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

function Round3VolunteerView({ volunteerId, matches, onJoin, onScore, onDisqualify }: { 
  volunteerId: string; 
  matches: any[]; 
  onJoin: (id: string) => void; 
  onScore: (id: string, idx: 1 | 2, score: boolean) => void; 
  onDisqualify: (id: string, idx: 1 | 2) => void;
}) {
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

function Round4PlayerView({ session, isEliminated }: { session: any; isEliminated: boolean }) {
  if (isEliminated) {
    return (
      <div className="defeat-screen" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💀</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ff4444' }}>PATHETIC</h1>
        <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>Your team couldn't even code their way out of a paper bag.</p>
        <p style={{ fontSize: '1.2rem', opacity: 0.6, marginTop: '1rem' }}>WORTHLESS. DISCARDED. FORGOTTEN.</p>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="loader-dots"><span></span><span></span><span></span></div>
        <p>LOADING EVALUATION DATA...</p>
      </div>
    );
  }
  
  if (session.status === 'finished') {
    if (session.result === 'pass') {
      return (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem', 
          border: '3px solid #fff'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>BARELY ACCEPTABLE</h1>
          <p style={{ fontSize: '1.5rem', opacity: 0.9 }}>You've proven you're not completely useless. Yet.</p>
          <p style={{ fontSize: '1.1rem', opacity: 0.7, marginTop: '1rem' }}>DON'T GET COMFORTABLE. THE REAL TEST BEGINS NOW.</p>
        </div>
      );
    } else {
      return (
        <div className="defeat-screen" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💀</div>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ff4444' }}>INCOMPETENT</h1>
          <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>Did you even try? What a waste of oxygen.</p>
          <p style={{ fontSize: '1.2rem', opacity: 0.6, marginTop: '1rem' }}>YOUR MEDIOCRITY IS NO LONGER TOLERATED.</p>
        </div>
      );
    }
  }
  
  if (session.status === 'active') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="loader-dots" style={{ marginBottom: '2rem' }}>
          <span></span><span></span><span></span>
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', letterSpacing: '2px' }}>JUDGMENT IN PROGRESS</h2>
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          border: '2px solid rgba(255, 255, 255, 0.3)',
          padding: '2rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem' 
        }}>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem' }}>YOUR FATE IS IN THE HANDS OF</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{session.volunteer_name}</p>
        </div>
        <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>Every keystroke is being scrutinized. Every mistake noted.</p>
        <p style={{ fontSize: '0.9rem', opacity: 0.5, marginTop: '1rem' }}>PRAY YOU'RE NOT AS USELESS AS YOU LOOK.</p>
      </div>
    );
  }
  
  return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', letterSpacing: '2px' }}>FINAL JUDGMENT</h2>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '2rem', 
        borderRadius: '8px', 
        marginBottom: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem' }}>TEAM UNDER SCRUTINY</p>
        <p style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1rem' }}>{session.team_name}</p>
        <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>SUSPECTS: {session.user1_name}, {session.user2_name}</p>
      </div>
      <div className="loader-dots" style={{ marginBottom: '1rem' }}>
        <span></span><span></span><span></span>
      </div>
      <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>Waiting for someone to decide if you're worth keeping...</p>
    </div>
  );
}

function Round4VolunteerView({ sessions, volunteerId, onJoinSession, onEvaluate }: {
  sessions: any[];
  volunteerId: string;
  onJoinSession: (sessionId: string) => void;
  onEvaluate: (sessionId: string, result: 'pass' | 'fail') => void;
}) {
  const mySession = sessions.find(s => s.volunteer_id === volunteerId && s.status === 'active');
  
  if (mySession) {
    return (
      <div className="card" style={{ 
        padding: '2rem', 
        borderRadius: '0px', 
        border: '3px solid black',
        marginTop: '1rem',
        background: '#fff'
      }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', letterSpacing: '2px', fontWeight: '900' }}>DECIDE THEIR FATE</h2>
        <p style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '1rem' }}>{mySession.team_name}</p>
        <p style={{ fontSize: '1.1rem', marginBottom: '2rem', opacity: 0.8, fontWeight: 'bold' }}>
          SUBJECTS: {mySession.user1_name.toUpperCase()}, {mySession.user2_name.toUpperCase()}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="approve-btn"
            style={{ flex: 1, fontSize: '1.2rem' }}
            onClick={() => onEvaluate(mySession.id, 'pass')}
          >
            ✓ APPROVE
          </button>
          <button 
            className="terminate-btn"
            style={{ flex: 1, fontSize: '1.2rem' }}
            onClick={() => onEvaluate(mySession.id, 'fail')}
          >
            ✗ TERMINATE
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ marginTop: '1rem' }}>
      <h2 className="section-title">JUDGMENT QUEUE - WHO LIVES, WHO DIES</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {sessions.map(s => (
          <div key={s.id} className="card" style={{ 
            padding: '1.2rem',
            border: s.status === 'finished' ? '1px solid rgba(255, 255, 255, 0.1)' : '2px solid rgba(255, 255, 255, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1.2rem', letterSpacing: '1px' }}>{s.team_name}</strong>
                <div style={{ fontSize: '0.9rem', opacity: 0.6, marginTop: '0.4rem' }}>
                  {s.user1_name}, {s.user2_name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 'bold',
                  opacity: s.status === 'finished' ? 0.5 : 1,
                  letterSpacing: '1px'
                }}>
                  {s.status.toUpperCase()}
                </span>
                {s.status === 'waiting' && (
                  <button 
                    className="submit-btn"
                    onClick={() => onJoinSession(s.id)}
                    style={{ 
                      padding: '0.6rem 1.2rem', 
                      fontSize: '0.9rem',
                      letterSpacing: '1px' 
                    }}
                  >
                    BEGIN EVAL
                </button>
                )}
                {s.status === 'finished' && (
                  <div style={{ 
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    color: s.result === 'pass' ? '#00ff00' : '#ff4444',
                    letterSpacing: '1px'
                  }}>
                    {s.result === 'pass' ? '✓ APPROVED' : '✗ TERMINATED'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
            <p>NO TEAMS IN EVALUATION QUEUE</p>
          </div>
        )}
      </div>
    </div>
  );
}


function Round5PlayerView({ game, userId, onSelectCard }: { 
  game: any; 
  userId: string;
  onSelectCard: (card: 'ATTACK' | 'FORTIFY' | 'CONVERGE', pact?: string) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (!game || game.status !== 'active') return;
    
    // Force set to 60/5 on round/revealed change
    const updateTimer = () => {
      const start = new Date(game.subround_started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      
      const currentRoundTurns = game.turns?.filter((t: any) => t.round_number === game.current_round) || [];
      const revealed = currentRoundTurns.length > 0 && currentRoundTurns.every((t: any) => t.is_revealed);
      
      const limit = game.current_round === 1 ? 120 : 60;
      if (revealed) {
        setSecondsLeft(Math.max(0, (limit + 5) - elapsed));
      } else {
        setSecondsLeft(Math.max(0, limit - elapsed));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [game, game.current_round, game.subround_started_at]);

  if (!game) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="loader-dots"><span></span><span></span><span></span></div>
        <p>LOADING PARADOX DATA...</p>
      </div>
    );
  }

  const isTeamA = game.team_a_user1 === userId || game.team_a_user2 === userId;
  const myTeam = isTeamA ? 'A' : 'B';
  const myMomentum = isTeamA ? game.team_a_momentum : game.team_b_momentum;
  const opponentMomentum = isTeamA ? game.team_b_momentum : game.team_a_momentum;
  const turnOrder = isTeamA ? game.team_a_turn_order : game.team_b_turn_order;
  
  const isMyTurn = game.current_round === 1 || (turnOrder && turnOrder[(game.current_round - 1) % 2] === userId);
  
  const currentRoundTurns = game.turns?.filter((t: any) => t.round_number === game.current_round) || [];
  const myTurn = currentRoundTurns.find((t: any) => t.player_id === userId);
  const bothSubmitted = currentRoundTurns.length === 2;
  const revealed = bothSubmitted && currentRoundTurns.every((t: any) => t.is_revealed);

  const [selectedPact, setSelectedPact] = useState<string | undefined>(undefined);
  const [showGuide, setShowGuide] = useState(false);

  const pactOptions = [
    { id: 'reduce_penalty', label: '🛡️ REDUCE PENALTY', desc: 'Convert penalty loss to -1' },
    { id: 'copy_opponent', label: '👥 COPY PREVIOUS', desc: 'Use opponent\'s last card' },
    { id: 'ignore_negative', label: '🚫 IGNORE NEGATIVE', desc: 'Cancel any negative change' }
  ];

  const MATRIX: any = {
    ATTACK: { ATTACK: [-1, -1], FORTIFY: [2, -1], CONVERGE: [-2, 2] },
    FORTIFY: { ATTACK: [-1, 2], FORTIFY: [0, 0], CONVERGE: [1, -1] },
    CONVERGE: { ATTACK: [2, -2], FORTIFY: [-1, 1], CONVERGE: [3, 3] }
  };

  if (game.status === 'finished') {
    const won = (game.result === 'team_a_win' && isTeamA) || 
                (game.result === 'team_b_win' && !isTeamA) || 
                game.result === 'both_win';
    
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        {won ? (
          <>
            <h1 style={{ fontSize: '4rem', color: '#00ff00' }}>VICTORY</h1>
            <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>YOU HAVE CONQUERED THE PARADOX</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '4rem', color: '#ff4444' }}>DEFEAT</h1>
            <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>THE PARADOX HAS CONSUMED YOU</p>
          </>
        )}
      </div>
    );
  }
  
  const myTeamPactUsed = isTeamA ? game.team_a_pact_used : game.team_b_pact_used;

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${(secondsLeft / (revealed ? 5 : 60)) * 100}%`,
        height: '8px',
        background: revealed ? '#4a5568' : (secondsLeft < 10 ? '#ef4444' : '#000'),
        transition: 'width 1s linear',
        zIndex: 1000
      }} />

      <div style={{ 
        background: '#000', 
        color: '#ff4444', 
        padding: '1.5rem', 
        marginBottom: '2rem',
        border: '3px solid #ff4444',
        fontWeight: '900',
        textAlign: 'center',
        boxShadow: '6px 6px 0px 0px black'
      }}>
        ⚠️ ABSOLUTE SILENCE - COMMUNICATING WITH YOUR PARTNER = INSTANT ELIMINATION ⚠️
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '900', borderBottom: '4px solid black', paddingBottom: '0.5rem', margin: 0 }}>ROUND 5: THE PARADOX</h2>
        <div style={{ 
          background: secondsLeft < 10 ? '#fee2e2' : '#f3f4f6', 
          color: secondsLeft < 10 ? '#ef4444' : '#000',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontWeight: '900',
          fontFamily: 'monospace',
          fontSize: '1.5rem',
          border: '2px solid black'
        }}>
          00:{secondsLeft.toString().padStart(2, '0')}
        </div>
      </div>
      
      <div style={{ background: 'rgba(0,0,0,0.05)', padding: '1rem', marginBottom: '1.5rem', border: '2px solid black' }}>
        <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}><strong>OBJECTIVE:</strong> Survive 9 turns. If your momentum hits 0, you **DIE** instantly.</p>
        <p style={{ fontSize: '0.9rem' }}><strong>TURNS:</strong> Players alternate every turn. 1 minute per round.</p>
      </div>

      <button 
        onClick={() => setShowGuide(!showGuide)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1.5rem', border: '2px solid black', fontWeight: '900', cursor: 'pointer', background: showGuide ? '#000' : '#fff', color: showGuide ? '#fff' : '#000' }}
      >
        {showGuide ? '🔽 HIDE BATTLE LOGIC' : '▶️ SHOW BATTLE LOGIC'}
      </button>

      {showGuide && (
        <div style={{ padding: '1rem', border: '2px solid black', marginBottom: '1.5rem', fontSize: '0.75rem', background: '#fafafa' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid black' }}>
                <th>YOURS</th>
                <th>THEIRS</th>
                <th>RESULT (YOU/THEM)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(MATRIX).map(y => Object.keys(MATRIX[y]).map(t => (
                <tr key={`${y}-${t}`} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '4px', fontWeight: 'bold' }}>{y}</td>
                  <td style={{ padding: '4px' }}>{t}</td>
                  <td style={{ padding: '4px', color: MATRIX[y][t][0] > 0 ? '#00aa00' : MATRIX[y][t][0] < 0 ? '#cc0000' : 'inherit' }}>
                    {MATRIX[y][t][0] > 0 ? '+' : ''}{MATRIX[y][t][0]} / {MATRIX[y][t][1] > 0 ? '+' : ''}{MATRIX[y][t][1]}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '2rem 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>TEAM {myTeam} (YOU)</div>
          <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{myMomentum}</div>
          <div style={{ fontSize: '0.7rem' }}>MOMENTUM</div>
        </div>
        <div style={{ fontSize: '2rem', opacity: 0.3 }}>VS</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>OPPONENT</div>
          <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{opponentMomentum}</div>
          <div style={{ fontSize: '0.7rem' }}>MOMENTUM</div>
        </div>
      </div>
      
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <strong>Sub-Round:</strong> {game.current_round}/9
          {game.is_sudden_death && <span style={{ color: '#ff4444', marginLeft: '1rem' }}>⚡ SUDDEN DEATH</span>}
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: myTeamPactUsed ? '#ff4444' : '#00ff00' }}>
            PACT: {myTeamPactUsed ? 'USED' : 'AVAILABLE'}
          </span>
        </div>
      </div>
      
      {revealed ? (
        <div style={{ textAlign: 'center', background: '#222', color: 'white', padding: '1.5rem', borderRadius: '8px', border: '4px solid #00ff00', animation: 'pulse 2s infinite' }}>
          <h3 style={{ color: '#00ff00', fontSize: '1.2rem', fontWeight: 'bold' }}>REVEALED!</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#aaa' }}>TEAM A</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentRoundTurns.find((t: any) => t.team === 'A')?.card_selected}</div>
              {currentRoundTurns.find((t: any) => t.team === 'A')?.pact_used && (
                <div style={{ fontSize: '0.6rem', color: '#ff4444' }}>PACT: {currentRoundTurns.find((t: any) => t.team === 'A').pact_used}</div>
              )}
            </div>
            <div style={{ fontSize: '2rem', color: '#444' }}>VS</div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#aaa' }}>TEAM B</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentRoundTurns.find((t: any) => t.team === 'B')?.card_selected}</div>
              {currentRoundTurns.find((t: any) => t.team === 'B')?.pact_used && (
                <div style={{ fontSize: '0.6rem', color: '#ff4444' }}>PACT: {currentRoundTurns.find((t: any) => t.team === 'B').pact_used}</div>
              )}
            </div>
          </div>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', opacity: 0.8, color: '#00ff00' }}>AUTO-ADVANCING IN {secondsLeft}s...</p>
        </div>
      ) : isMyTurn && !myTurn ? (
        <>
          <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>YOUR TURN - SELECT A CARD:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {['ATTACK', 'FORTIFY', 'CONVERGE'].map(card => (
              <button 
                key={card}
                className="primary-btn"
                onClick={() => onSelectCard(card as any, selectedPact)}
                style={{ padding: '2rem 1rem' }}
              >
                {card}
              </button>
            ))}
          </div>

          {!myTeamPactUsed && !game.is_sudden_death && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem' }}>USE SECRET PACT? (ONCE PER GAME)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pactOptions.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setSelectedPact(selectedPact === p.id ? undefined : p.id)}
                    style={{ 
                      padding: '1rem', 
                      background: selectedPact === p.id ? '#ff4444' : 'transparent',
                      color: selectedPact === p.id ? 'white' : 'black',
                      border: '2px solid #ff4444',
                      borderRadius: '8px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{p.label}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : bothSubmitted ? (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7, border: '2px dashed black' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>BOTH SUBMITTED</p>
          <p>Revealing result in {secondsLeft}s...</p>
        </div>
      ) : myTurn ? (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7, border: '2px dashed black' }}>
          <p>Card selected ({myTurn.card_selected}). Waiting for opponent...</p>
          {myTurn.pact_used && <p style={{ color: '#ff4444', fontWeight: 'bold' }}>SECRET PACT ACTIVATED: {myTurn.pact_used}</p>}
          <p style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Auto-resolve in {secondsLeft}s</p>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7, border: '2px dashed black' }}>
          <p>Waiting for your teammate or opponent to play...</p>
          <p style={{ fontSize: '0.8rem', marginTop: '1rem' }}>Auto-resolve in {secondsLeft}s</p>
        </div>
      )}

      {/* BATTLE HISTORY LOG */}
      <div style={{ marginTop: '2.5rem', borderTop: '4px solid black', paddingTop: '1.5rem' }}>
        <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '1rem' }}>BATTLE HISTORY</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.isArray(game.turns) && game.turns
            .filter((t:any) => t && t.is_revealed)
            .sort((a:any, b:any) => (b.round_number || 0) - (a.round_number || 0))
            .map((t: any, _: number, arr: any[]) => {
            // Group turns by round
            if (t.team === 'B') return null; // We'll process A and find B
            const roundNum = t.round_number;
            const turnA = t;
            const turnB = arr.find((alt: any) => alt.round_number === roundNum && alt.team === 'B');
            if (!turnB) return null;

            if (!MATRIX[turnA.card_selected] || !MATRIX[turnA.card_selected][turnB.card_selected]) return null;

            const [dA, dB] = MATRIX[turnA.card_selected][turnB.card_selected];
            const isMeA = isTeamA;
            const myDelta = isMeA ? dA : dB;
            const oppDelta = isMeA ? dB : dA;

            return (
              <div key={roundNum} style={{ 
                padding: '10px', 
                border: '2px solid black', 
                background: '#fff',
                fontSize: '0.8rem',
                display: 'grid',
                gridTemplateColumns: '50px 1fr 1fr',
                alignItems: 'center'
              }}>
                <div style={{ fontWeight: '900' }}>#{roundNum}</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>YOU</div>
                  <div style={{ fontWeight: 'bold' }}>{isMeA ? turnA.card_selected : turnB.card_selected}</div>
                  <div style={{ color: myDelta >= 0 ? '#00aa00' : '#ff4444', fontWeight: '900' }}>
                    {myDelta > 0 ? '+' : ''}{myDelta}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>THEM</div>
                  <div style={{ fontWeight: 'bold' }}>{isMeA ? turnB.card_selected : turnA.card_selected}</div>
                  <div style={{ color: oppDelta >= 0 ? '#00aa00' : '#ff4444', fontWeight: '900' }}>
                    {oppDelta > 0 ? '+' : ''}{oppDelta}
                  </div>
                </div>
              </div>
            );
          })}
          {(!Array.isArray(game.turns) || game.turns.filter((t: any) => t.is_revealed).length === 0) && (
            <p style={{ opacity: 0.5, fontStyle: 'italic', textAlign: 'center' }}>No history yet. The battle has just begun.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminView({ 
  gameState, 
  leaderboard, 
  adminUsers, 
  adminTeams, 
  round3Matches, 
  round4Sessions, 
  round5Games,
  onEliminateUser,
  onReviveUser,
  onEliminateTeam,
  onReviveTeam,
  onStartRound,
  onFinishRound,
  onStartRound2,
  onStartRound3,
  onFinishRound3,
  onStartRound4,
  onFinishRound4,
  onStartRound5,
  onFinishRound5,
  onStartRound6,
  onStartRound7,
  onFinishRound6,
  onResetRound
}: any) {
  const [activeTab, setActiveTab] = useState('control');
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [dataSubTab, setDataSubTab] = useState('r3');
  const surviversCount = adminUsers.filter((u: any) => !u.is_eliminated && u.role === 'player').length;

  return (
    <div className="admin-view-root">
      <div className="admin-nav-tabs">
        <button className={activeTab === 'control' ? 'active' : ''} onClick={() => setActiveTab('control')}>CONTROL</button>
        <button className={activeTab === 'leaderboard' ? 'active' : ''} onClick={() => setActiveTab('leaderboard')}>LEADERBOARD</button>
        <button className={activeTab === 'management' ? 'active' : ''} onClick={() => setActiveTab('management')}>MANAGEMENT</button>
        <button className={activeTab === 'data' ? 'active' : ''} onClick={() => setActiveTab('data')}>DATA HISTORY</button>
        <button className={activeTab === 'recovery' ? 'active' : ''} onClick={() => setActiveTab('recovery')}>RECOVERY</button>
      </div>

      <div className="admin-content-area">
        {activeTab === 'control' && (
          <div className="admin-tab-pane">
            <h1 className="admin-pane-title">MISSION CONTROL</h1>
            <div className="admin-summary-cards">
              <div className="admin-sum-card">
                <span className="label">ROUND</span>
                <span> &nbsp; </span>
                <span className="value" style={{ marginTop: '0.5rem' }}>{gameState.current_round}</span>
              </div>
              <div className="admin-sum-card">
                <span className="label">STATUS</span>
                <span> &nbsp; </span>
                <span className="value" style={{ 
                  marginTop: '0.5rem',
                  color: gameState.status === 'active' ? '#4ade80' : 
                         gameState.status === 'waiting' ? '#fbbf24' : 
                         gameState.status === 'finished' ? '#f87171' : 'inherit'
                }}>
                  {gameState.status.toUpperCase()}
                </span>
              </div>
              <div className="admin-sum-card">
                <span className="label">SURVIVORS</span>
                <span> &nbsp; </span>
                <span className="value">
                  {surviversCount} 
                  {gameState.current_round >= 2 && (
                    <span style={{ fontSize: '0.6em', marginLeft: '6px', opacity: 0.8 }}>
                      ({adminTeams.filter((t: any) => !t.user1_eliminated && !t.user2_eliminated).length} Teams)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="admin-control-grid">
              <div className="card control-card">
                <h3>GLOBAL CONTROLS</h3>
                <div className="btn-group-vertical">
                   {gameState.current_round === 0 && (
                     <button onClick={onStartRound} className="admin-btn primary">START ROUND 1</button>
                   )}
                   
                   {gameState.status === 'active' && gameState.current_round >= 1 && gameState.current_round <= 6 && (
                     <button 
                       onClick={() => {
                         if (gameState.current_round === 1 || gameState.current_round === 2) onFinishRound();
                         else if (gameState.current_round === 3) onFinishRound3();
                         else if (gameState.current_round === 4) onFinishRound4();
                         else if (gameState.current_round === 5) onFinishRound5();
                         else if (gameState.current_round === 6) onFinishRound6();
                       }} 
                       className="admin-btn primary"
                     >
                       FINISH ROUND {gameState.current_round}
                     </button>
                   )}
                </div>
              </div>

              <div className="card control-card">
                <h3>TRANSITIONS</h3>
                <div className="btn-group-vertical">
                   {gameState.current_round === 1 && gameState.status === 'finished' && (
                     <button onClick={() => {
                        const count = window.prompt(`How many players (Top X) should be 'Saved' as Leaders? (Total Players: ${leaderboard.length})`, Math.min(10, Math.floor(leaderboard.length / 2)).toString());
                        if (count !== null) onStartRound2(parseInt(count));
                     }} className="admin-btn">ACTIVATE R2: LOTTERY</button>
                   )}
                   
                   {gameState.current_round === 2 && gameState.status === 'finished' && (
                     <button onClick={onStartRound3} className="admin-btn">ACTIVATE R3: DUELS</button>
                   )}

                   {gameState.current_round === 3 && gameState.status === 'waiting' && (
                     <button onClick={onStartRound4} className="admin-btn">ACTIVATE R4: CODING</button>
                   )}

                   {gameState.current_round === 4 && gameState.status === 'waiting' && (
                     <button onClick={onStartRound5} className="admin-btn">ACTIVATE R5: PARADOX</button>
                   )}

                   {gameState.current_round === 5 && gameState.status === 'waiting' && (
                     <button onClick={onStartRound6} className="admin-btn">ACTIVATE R6: PIGEON</button>
                   )}

                   {gameState.current_round === 6 && gameState.status === 'waiting' && (
                     <button onClick={onStartRound7} className="admin-btn">ACTIVATE R7: HEARTS</button>
                   )}

                   {gameState.current_round === 7 && (
                     <p style={{ textAlign: 'center', opacity: 0.7, padding: '1rem' }}>Final Round Active</p>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="admin-tab-pane">
            <div className="admin-leaderboard">
              <h2>LIVE LEADERBOARD (R1)</h2>
              <div className="leaderboard-table-wrapper">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>RANK</th>
                      <th>PLAYER</th>
                      <th>SCORE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard
                      .slice((leaderboardPage - 1) * 10, leaderboardPage * 10)
                      .map((entry: any, i: number) => (
                      <tr key={entry.id} className={entry.is_eliminated ? 'eliminated' : ''}>
                        <td className="leaderboard-rank">#{((leaderboardPage - 1) * 10) + i + 1}</td>
                        <td className="leaderboard-name">{entry.name}</td>
                        <td className="leaderboard-score">{entry.score} pts</td>
                        <td className="leaderboard-status">
                          {entry.is_eliminated ? (
                            <span className="status-badge eliminated">ELIMINATED</span>
                          ) : (
                            <span className="status-badge active">ACTIVE</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {Math.ceil(leaderboard.length / 10) > 1 && (
                <div className="pagination">
                  <button 
                    onClick={() => setLeaderboardPage(p => Math.max(1, p - 1))}
                    disabled={leaderboardPage === 1}
                    className="pagination-btn"
                  >
                    ← PREV
                  </button>
                  <span className="pagination-info">
                    Page {leaderboardPage} of {Math.ceil(leaderboard.length / 10)}
                  </span>
                  <button 
                    onClick={() => setLeaderboardPage(p => Math.min(Math.ceil(leaderboard.length / 10), p + 1))}
                    disabled={leaderboardPage === Math.ceil(leaderboard.length / 10)}
                    className="pagination-btn"
                  >
                    NEXT →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'management' && (
          <div className="admin-tab-pane">
            <h1 className="admin-pane-title">USER MANAGEMENT</h1>
            <div className="admin-management-grid">
              <div className="card">
                <h3>PLAYERS LIST</h3>
                <div className="admin-user-scroll">
                  {adminUsers.filter((u: any) => u.role === 'player').map((u: any) => (
                    <div key={u.id} className="admin-user-item">
                      <span style={{ 
                        color: u.is_eliminated ? '#ef4444' : 'inherit',
                        textDecoration: u.is_eliminated ? 'line-through' : 'none'
                      }}>
                        {u.name} ({u.email})
                      </span>
                      {u.is_eliminated ? (
                        <button className="admin-btn-sm revive" onClick={() => onReviveUser(u.id)}>REVIVE</button>
                      ) : (
                        <button className="admin-btn-sm eliminate" onClick={() => onEliminateUser(u.id)}>ELIMINATE</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>TEAMS MANAGEMENT (R2+)</h3>
                <div className="admin-user-scroll">
                  {adminTeams.map((t: any) => {
                    // Mark team as 'dead' if EITHER player is eliminated
                    const isTeamCompromised = t.user1_eliminated || t.user2_eliminated;
                    return (
                      <div key={t.id} className="admin-user-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <strong style={{ 
                            fontSize: '1rem', 
                            color: isTeamCompromised ? '#ef4444' : 'inherit',
                            textDecoration: isTeamCompromised ? 'line-through' : 'none'
                          }}>
                            {t.name}
                          </strong>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {isTeamCompromised ? (
                              <button className="admin-btn-sm revive" onClick={() => onReviveTeam(t.id)}>REVIVE</button>
                            ) : (
                              <button className="admin-btn-sm eliminate" onClick={() => onEliminateTeam(t.id)}>ELIMINATE</button>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                          {t.user1_name} {t.user1_eliminated ? '💀' : '❤️'} | {t.user2_name} {t.user2_eliminated ? '💀' : '❤️'}
                        </div>
                      </div>
                    );
                  })}
                  {adminTeams.length === 0 && (
                    <p className="empty">
                      {gameState.current_round < 2 ? "Teams will be formed in Round 2." : "No teams have been formed yet."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="admin-tab-pane">
            <h1 className="admin-pane-title">GAME DATA LOGS</h1>
            <div className="admin-data-tabs">
              <button className={dataSubTab === 'r3' ? 'active' : ''} onClick={() => setDataSubTab('r3')}>R3 MATCHES</button>
              <button className={dataSubTab === 'r4' ? 'active' : ''} onClick={() => setDataSubTab('r4')}>R4 SESSIONS</button>
              <button className={dataSubTab === 'r5' ? 'active' : ''} onClick={() => setDataSubTab('r5')}>R5 GAMES</button>
            </div>
            
            <div className="admin-data-content">
              {dataSubTab === 'r3' && (
                <>
                  <h4>ROUND 3: PHYSICAL DUELS</h4>
                  <div className="admin-user-list">
                    {round3Matches.length > 0 ? round3Matches.map((m: any) => (
                      <div key={m.id} className="admin-user-item">
                        <div className="admin-user-info">
                          <strong>{m.team1_name} vs {m.team2_name}</strong>
                          <small>Status: {m.status} | Winner: {m.winner_name || m.winner_team_id || 'PENDING'}</small>
                        </div>
                      </div>
                    )) : <p className="empty">No Round 3 match data available.</p>}
                  </div>
                </>
              )}

              {dataSubTab === 'r4' && (
                <>
                  <h4>ROUND 4: COGNITIVE TECHNICAL ROUND</h4>
                  <div className="admin-user-list">
                    {round4Sessions.length > 0 ? round4Sessions.map((s: any) => {
                      const isTeamCompromised = s.user1_eliminated || s.user2_eliminated;
                      return (
                        <div key={s.id} className="admin-user-item">
                          <div className="admin-user-info">
                            <strong style={{ 
                              color: isTeamCompromised ? '#ef4444' : 'inherit',
                              textDecoration: isTeamCompromised ? 'line-through' : 'none'
                            }}>
                              {s.team_name} (Session #{s.id.slice(0, 8)})
                            </strong>
                            <small>Status: {s.status}</small>
                          </div>
                        </div>
                      );
                    }) : <p className="empty">No Round 4 session data available.</p>}
                  </div>
                </>
              )}

              {dataSubTab === 'r5' && (
                <>
                  <h4>ROUND 5: THE PARADOX GAMES</h4>
                  <div className="admin-user-list">
                    {round5Games.length > 0 ? round5Games.map((g: any) => (
                      <div key={g.id} className="admin-user-item">
                        <div className="admin-user-info">
                          <strong>{g.team_a_name} vs {g.team_b_name}</strong>
                          <small>Status: {g.status} | Result: {g.result || 'IN PROGRESS'}</small>
                        </div>
                      </div>
                    )) : <p className="empty">No Round 5 game data available.</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'recovery' && (
          <div className="admin-tab-pane">
            <h1 className="admin-pane-title">SYSTEM RECOVERY</h1>
            <div className="card" style={{ border: '2px solid #ef4444', background: '#fef2f2' }}>
              <h3 style={{ color: '#b91c1c', marginTop: 0 }}>⚠️ DANGER ZONE: ROUND RESET</h3>
              <p style={{ fontSize: '0.9rem', color: '#7f1d1d', marginBottom: '1.5rem' }}>
                Jumping back to a previous round will <strong>permanently delete</strong> all data collected in subsequent rounds. 
                This action is irreversible.
              </p>
              
              <div className="btn-group-vertical" style={{ gap: '1rem' }}>
                {gameState.current_round > 1 && (
                  <button className="admin-btn danger" onClick={() => onResetRound(1)}>RESET TO ROUND 1 (RANKINGS)</button>
                )}
                {gameState.current_round > 2 && (
                  <button className="admin-btn danger" onClick={() => onResetRound(2)}>RESET TO ROUND 2 (LOTTERY)</button>
                )}
                {gameState.current_round > 3 && (
                  <button className="admin-btn danger" onClick={() => onResetRound(3)}>RESET TO ROUND 3 (DUELS)</button>
                )}
                {gameState.current_round > 4 && (
                  <button className="admin-btn danger" onClick={() => onResetRound(4)}>RESET TO ROUND 4 (CODING)</button>
                )}
                {gameState.current_round > 5 && (
                  <button className="admin-btn danger" onClick={() => onResetRound(5)}>RESET TO ROUND 5 (PARADOX)</button>
                )}
                {gameState.current_round <= 1 && (
                  <p style={{ opacity: 0.5, textAlign: 'center' }}>No past rounds available for recovery.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Round5VolunteerView({ games, onDisqualify, onEndNow }: {
  games: any[];
  onDisqualify: (gameId: string, team: 'A' | 'B') => void;
  onEndNow: (gameId: string) => void;
}) {
  return (
    <div style={{ marginTop: '1rem' }}>
      <h2 className="section-title">ROUND 5: PARADOX MONITORING</h2>
      <div style={{ background: '#fff3cd', padding: '1rem', marginBottom: '2rem', border: '2px solid #856404', borderRadius: '4px' }}>
        <h3 style={{ color: '#856404', marginTop: 0 }}>JUDGE'S PROTOCOL</h3>
        <p style={{ fontSize: '0.9rem' }}>Automation is active. Intervene ONLY for rules violations (talking, signaling). Use the <strong>DQ</strong> buttons to instantly eliminate a team.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {(games || []).map(g => {
          const currentRoundTurns = g.turns?.filter((t: any) => t.round_number === g.current_round) || [];
          const bothSubmitted = currentRoundTurns.length === 2;
          const isRevealed = bothSubmitted && currentRoundTurns.every((t: any) => t.is_revealed);

          const turnA = currentRoundTurns.find((t: any) => t.is_revealed && t.team === 'A');
          const turnB = currentRoundTurns.find((t: any) => t.is_revealed && t.team === 'B');

          return (
            <div key={g.id} className="card" style={{ padding: '1.5rem', border: g.status === 'finished' ? '2px solid #ddd' : '4px solid black' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: '900', fontSize: '1.1rem' }}>GAME MONITOR</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: g.status === 'active' ? '#00cc00' : '#666' }}>{g.status.toUpperCase()}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{g.team_a_name}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{g.team_a_momentum}</div>
                  <div style={{ fontSize: '0.7rem' }}>MOMENTUM</div>
                  {g.status === 'active' && (
                    <button 
                      onClick={() => onDisqualify(g.id, 'A')}
                      style={{ marginTop: '1rem', background: '#c53030', color: 'white', padding: '5px 10px', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    > RULE VIOLATION: DQ </button>
                  )}
                </div>
                <div style={{ opacity: 0.3, fontWeight: 'bold', textAlign: 'center' }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{g.team_b_name || 'BYE'}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{g.team_b_momentum}</div>
                  <div style={{ fontSize: '0.7rem' }}>MOMENTUM</div>
                  {g.status === 'active' && g.team_b_id && (
                    <button 
                      onClick={() => onDisqualify(g.id, 'B')}
                      style={{ marginTop: '1rem', background: '#c53030', color: 'white', padding: '5px 10px', fontSize: '0.7rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    > RULE VIOLATION: DQ </button>
                  )}
                </div>
              </div>

              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <strong>SUB-ROUND:</strong> {g.current_round}/9 
                  {g.is_sudden_death && <span style={{ color: '#c53030', fontWeight: 'bold' }}> (SUDDEN DEATH)</span>}
                </div>
                {g.status === 'active' && (
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>STATUS:</strong> {isRevealed ? 'REVEALED - AUTO-NEXT SOON' : (bothSubmitted ? 'BOTH READY' : `WAITING (${currentRoundTurns.length}/2)`)}
                  </div>
                )}
              </div>

              {isRevealed && turnA && turnB && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.5rem', background: '#e2e8f0', borderRadius: '4px' }}>
                    <div style={{ opacity: 0.6 }}>A played:</div>
                    <div style={{ fontWeight: 'bold' }}>{turnA.card_selected}</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: '#e2e8f0', borderRadius: '4px' }}>
                    <div style={{ opacity: 0.6 }}>B played:</div>
                    <div style={{ fontWeight: 'bold' }}>{turnB.card_selected}</div>
                  </div>
                </div>
              )}
              


              {g.status === 'finished' && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#000', color: '#fff', textAlign: 'center', fontWeight: 'bold', borderRadius: '4px' }}>
                  RESULT: {g.result?.replace('_', ' ').toUpperCase()}
                </div>
              )}

              {g.status === 'active' && (
                <button 
                  onClick={() => onEndNow(g.id)}
                  style={{ width: '100%', marginTop: '1rem', background: '#4a5568', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                > ⏹️ END THIS ROUND NOW </button>
              )}
            </div>
          );
        })}
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
  
  // Round 2 States
  const [lotteryPool, setLotteryPool] = useState<{id: string, is_taken: boolean, taken_by?: string, taken_by_name?: string, content_name?: string, team_name?: string}[]>([]);
  const [round2Role, setRound2Role] = useState<'leader' | 'selector' | null>(null);
  const [selectionResult, setSelectionResult] = useState<{type: 'team' | 'eliminated', partner?: string, quote?: string, teamName?: string} | null>(null);
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [isEliminated, setIsEliminated] = useState(false);
  const [round3Matches, setRound3Matches] = useState<any[]>([]);
  const [round4Sessions, setRound4Sessions] = useState<any[]>([]);
  const [round5Games, setRound5Games] = useState<any[]>([]);
  const [round6State, setRound6State] = useState<any>(null); // ROUND 6 STATE (VOTING)
  const [round7State, setRound7State] = useState<any>(null); // ROUND 7 STATE (HEARTS)
  const [r7Logs, setR7Logs] = useState<string[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]); // New state for Admin
  const [adminTeams, setAdminTeams] = useState<any[]>([]); // Admin/Volunteer teams list
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

    const socket = new WebSocket(WS_URL);
    
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
        if (data.round6_state) setRound6State(data.round6_state);
        if (data.round7_state) setRound7State(data.round7_state);
        if (data.lottery_pool) setLotteryPool(data.lottery_pool);
        if (data.admin_users) setAdminUsers(data.admin_users);
        if (data.admin_teams) setAdminTeams(data.admin_teams);
        if (data.round3_matches) setRound3Matches(data.round3_matches);
        if (data.round4_sessions) setRound4Sessions(data.round4_sessions);
        if (data.round5_games) setRound5Games(data.round5_games);
      } else if (data.type === 'state_update') {
        console.log('RECEIVED STATE UPDATE:', data.state);
        setGameState(data.state);
      } else if (data.type === 'error') {
        alert('SYSTEM ERROR: ' + data.message);
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
        // Update elimination status without showing alerts
        if (data.result === 'disqualified') {
          setIsEliminated(true);
        } else if (data.result === 'won_by_dq') {
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
      } else if (data.type === 'round4_init' || data.type === 'round4_update') {
        const sessions = data.sessions as any[];
        console.log('Updating Round 4 Sessions:', sessions);
        setRound4Sessions(sessions);
        
        // Check if current user is eliminated based on session results
        if (user && user.role === 'player') {
          const mySession = sessions.find(s => 
            s.user1_id === user.id || s.user2_id === user.id
          );
          if (mySession && mySession.status === 'finished') {
            if (mySession.result === 'fail') {
              console.log('Setting isEliminated: TRUE (Team failed)');
              setIsEliminated(true);
            } else {
              console.log('Setting isEliminated: FALSE (Team passed)');
              setIsEliminated(false);
            }
          }
        }
      } else if (data.type === 'round5_init' || data.type === 'round5_update') {
        const games = data.games as any[];
        console.log('Updating Round 5 Games:', games);
        setRound5Games(games);
        
        // Check elimination based on game results
        if (user && user.role === 'player') {
          const myGame = games.find(g => 
            g.team_a_user1 === user.id || g.team_a_user2 === user.id || 
            g.team_b_user1 === user.id || g.team_b_user2 === user.id
          );
          if (myGame && myGame.status === 'finished') {
            const isTeamA = myGame.team_a_user1 === user.id || myGame.team_a_user2 === user.id;
            if (myGame.result === 'team_a_win' && !isTeamA) {
              setIsEliminated(true);
            } else if (myGame.result === 'team_b_win' && isTeamA) {
              setIsEliminated(true);
            } else if (myGame.result === 'both_lose') {
              setIsEliminated(true);
            } else if (myGame.result === 'both_win' || 
                       (myGame.result === 'team_a_win' && isTeamA) || 
                       (myGame.result === 'team_b_win' && !isTeamA)) {
              setIsEliminated(false);
            }
          }
        }
      } else if (data.type === 'round6_update') {
        console.log('Using Round 6 Update:', data.state);
        setRound6State(data.state);
      } else if (data.type === 'round7_update') {
        console.log('Using Round 7 Update:', data.state);
        setRound7State(data.state);
      } else if (data.type === 'r7_cycle_logs') {
        setR7Logs(data.logs);
      } else if (data.type === 'admin_users') {
        setAdminUsers(data.users);
      } else if (data.type === 'admin_teams') {
        setAdminTeams(data.teams);
      } else if (data.type === 'status_update') {
        setIsEliminated(data.isEliminated);
      }
    };

    setWs(socket);

    // Fetch players
    fetch(`${API_URL}/players`, {
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



  const finishRound = () => {
    ws?.send(JSON.stringify({ type: 'finish_round' }));
  };

  const startRound2 = (leadersCount?: number) => {
    ws?.send(JSON.stringify({ type: 'start_round_2', leadersCount }));
  };

  const startRound3 = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'start_round_3' }));
    }
  };

  // ROUND 6 HANDLERS
  const startR6Timer = () => {
    ws?.send(JSON.stringify({ type: 'r6_start_timer' }));
  };

  const submitR6Vote = (targetId: string, safety: boolean) => {
    ws?.send(JSON.stringify({ type: 'r6_vote', targetId, useSafety: safety }));
  };

  const resolveR6 = () => {
    ws?.send(JSON.stringify({ type: 'r6_resolve' }));
  };

  const nextR6Cycle = () => {
    ws?.send(JSON.stringify({ type: 'r6_next_subround' }));
  };

  const finishR6 = () => {
    ws?.send(JSON.stringify({ type: 'r6_finish' }));
  };

  const startR7Voting = () => {
    ws?.send(JSON.stringify({ type: 'r7_start_voting' }));
  };

  const submitR7Action = (action: string, targetId?: string) => {
    ws?.send(JSON.stringify({ type: 'r7_submit_action', action, targetId }));
  };

  const resolveR7Cycle = () => {
    ws?.send(JSON.stringify({ type: 'r7_resolve_cycle' }));
  };

  const resetR7Cycle = () => {
    if (window.confirm("FORCE RESET Round 7 Cycle? This clears all current actions and sets status to WAITING.")) {
      ws?.send(JSON.stringify({ type: 'r7_reset_cycle' }));
    }
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
      fetch(`${API_URL}/round3/disqualify`, {
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

  const finishRound3 = () => {
    console.log('Finishing Round 3...', ws ? 'WS connected' : 'WS NOT connected');
    ws?.send(JSON.stringify({ type: 'finish_round_3' }));
  };

  const startRound4 = () => {
    console.log('Starting Round 4...', ws ? 'WS connected' : 'WS NOT connected');
    if (ws) {
      console.log('WebSocket readyState:', ws.readyState, '(1=OPEN)');
      const message = JSON.stringify({ type: 'start_round_4' });
      console.log('Sending message:', message);
      ws.send(message);
      console.log('Message sent');
    }
  };
  const finishRound4 = () => {
    console.log('Finishing Round 4...');
    ws?.send(JSON.stringify({ type: 'finish_round_4' }));
  };

  const joinSession = (sessionId: string) => {
    ws?.send(JSON.stringify({ type: 'volunteer_session', sessionId }));
  };

  const evaluateTeam = (sessionId: string, result: 'pass' | 'fail') => {
    if (window.confirm(`Are you sure you want to ${result.toUpperCase()} this team?`)) {
      ws?.send(JSON.stringify({ type: 'evaluate_team', sessionId, result }));
    }
  };

  const startRound5 = () => {
    ws?.send(JSON.stringify({ type: 'start_round_5' }));
  };

  const selectCard5 = (gameId: string, card: 'ATTACK' | 'FORTIFY' | 'CONVERGE', pact?: string) => {
    ws?.send(JSON.stringify({ type: 'r5_select_card', gameId, card, pact }));
  };

  const finishRound5 = () => {
    ws?.send(JSON.stringify({ type: 'finish_round_5' }));
  };

  const endR5GameNow = (gameId: string) => {
    const choice = window.prompt(
      "MANUAL STOP: Choose the outcome.\n" +
      "Type 'A' -> Team A Wins (Pass)\n" +
      "Type 'B' -> Team B Wins (Pass)\n" +
      "Type 'BOTH' -> Both Teams Pass (Rare)\n" +
      "Type 'NONE' -> Both Teams Eliminated (Fail)\n\n" +
      "Type your choice (A/B/BOTH/NONE):"
    );

    if (choice) {
      const formatted = choice.toUpperCase().trim();
      if (['A', 'B', 'BOTH', 'NONE'].includes(formatted)) {
         ws?.send(JSON.stringify({ type: 'r5_end_now', gameId, outcome: formatted }));
      } else {
        alert("Invalid choice. Operation cancelled.");
      }
    }
  };



  const disqualifyTeam5 = (gameId: string, team: 'A' | 'B') => {
    if (window.confirm(`Are you sure you want to disqualify Team ${team} from game ${gameId}? This will eliminate them.`)) {
      ws?.send(JSON.stringify({ type: 'r5_disqualify_team', gameId, team }));
    }
  };

  const startRound6 = () => {
    ws?.send(JSON.stringify({ type: 'start_round_6' }));
  };

  const startRound7 = () => {
    ws?.send(JSON.stringify({ type: 'start_round_7' }));
  };

  const resetRound = (round: number) => {
    if (window.confirm(`⚠️ WARNING: YOU ARE ABOUT TO RESET THE GAME TO ROUND ${round}. THIS WILL DELETE DATA FROM ALL SUBSEQUENT ROUNDS. ARE YOU ABSOLUTELY SURE?`)) {
      ws?.send(JSON.stringify({ type: 'admin_reset_round', round }));
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

  const eliminateUser = (userId: string) => {
    ws?.send(JSON.stringify({ type: 'admin_manage_user', userId, isEliminated: true }));
  };

  const reviveUser = (userId: string) => {
    ws?.send(JSON.stringify({ type: 'admin_manage_user', userId, isEliminated: false }));
  };

  const eliminateTeam = (teamId: string) => {
    ws?.send(JSON.stringify({ type: 'admin_manage_team', teamId, isEliminated: true }));
  };

  const reviveTeam = (teamId: string) => {
    ws?.send(JSON.stringify({ type: 'admin_manage_team', teamId, isEliminated: false }));
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

  // Admin View
  if (user.role === 'admin') {
    return (
      <div className="container" style={{ minHeight: '100vh', padding: '0' }}>
        <div className="nav" style={{ padding: '0.5rem 1rem' }}>
          <div className="logo">BLINDTECH.EXE - ADMIN</div>
          <div className="user-info">
            <div className="user-meta">
              <div className="user-name">{user.name.toUpperCase()}</div>
              <div className="user-role" style={{ color: '#ff4444' }}>GAME MASTER</div>
            </div>
            <button onClick={logout} className="exit-btn">EXIT</button>
          </div>
        </div>
        <AdminView 
          gameState={gameState}
          leaderboard={leaderboard}
          adminUsers={adminUsers}
          adminTeams={adminTeams}
          round3Matches={round3Matches}
          round4Sessions={round4Sessions}
          round5Games={round5Games}
          onEliminateUser={eliminateUser}
          onReviveUser={reviveUser}
          onEliminateTeam={eliminateTeam}
          onReviveTeam={reviveTeam}
          onStartRound={startRound}
          onFinishRound={finishRound}
          onStartRound2={startRound2}
          onStartRound3={startRound3}
          onFinishRound3={finishRound3}
          onStartRound4={startRound4}
          onFinishRound4={finishRound4}
          onStartRound5={startRound5}
          onFinishRound5={finishRound5}
          onStartRound6={startRound6}
          onStartRound7={startRound7}
          onFinishRound6={finishR6}
          onResetRound={resetRound}
        />
      </div>
    );
  }

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
            <div className="card waiting-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <h2 className="section-title">INITIALIZING ARENA</h2>
              <p>Waiting for the <strong>Game Master</strong> to authorize the start of <strong>Round 1</strong>.</p>
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

          {gameState.status === 'waiting' && user.role === 'volunteer' && gameState.current_round === 3 && (
            <div className="card waiting-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <h2 className="section-title">ROUND 3 COMPLETE</h2>
              <p>Waiting for the <strong>Game Master</strong> to activate <strong>Round 4: Coding Club</strong>.</p>
            </div>
          )}

          {gameState.status === 'waiting' && user.role === 'volunteer' && gameState.current_round === 4 && (
            <div className="card waiting-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <h2 className="section-title">ROUND 4 COMPLETE</h2>
              <p>Waiting for the <strong>Game Master</strong> to activate <strong>Round 5: The Paradox</strong>.</p>
            </div>
          )}

          {gameState.status === 'active' && user.role === 'volunteer' && gameState.current_round === 1 && (
            <div className="card waiting-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h2 className="section-title">ROUND 1: POPULARITY HELL</h2>
              <p>Players are currently submitting their mission parameters.</p>
              <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
                <div className="stat-item" style={{ textAlign: 'center' }}>
                  <div className="stat-value">{players.length}</div>
                  <div className="stat-label">TOTAL OPERATIVES</div>
                </div>
              </div>
              <p style={{ marginTop: '1.5rem', opacity: 0.6 }}>Waiting for game master to conclude this phase.</p>
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

          {gameState.status === 'active' && user.role === 'player' && gameState.current_round === 4 && (
            <Round4PlayerView 
              session={round4Sessions[0]}
              isEliminated={isEliminated}
            />
          )}

          {gameState.status === 'active' && user.role === 'volunteer' && gameState.current_round === 4 && (
            <Round4VolunteerView 
              sessions={round4Sessions}
              volunteerId={user.id}
              onJoinSession={joinSession}
              onEvaluate={evaluateTeam}
            />
          )}

          {gameState.status === 'active' && user.role === 'player' && gameState.current_round === 5 && (
            (() => {
              const myGame = round5Games.find((g: any) => 
                g.team_a_user1 === user.id || g.team_a_user2 === user.id || 
                g.team_b_user1 === user.id || g.team_b_user2 === user.id
              );
              
              if (!myGame) {
                return (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loader-dots"><span></span><span></span><span></span></div>
                    <h3>SEARCHING FOR GAME DATA...</h3>
                    <p style={{ opacity: 0.6 }}>Synchronizing with the Paradox server.</p>
                  </div>
                );
              }

              return (
                <Round5PlayerView 
                  game={myGame}
                  userId={user.id}
                  onSelectCard={(card, pact) => selectCard5(myGame.id, card, pact)}
                />
              );
            })()
          )}

          {user.role === 'player' && gameState.status === 'waiting' && gameState.current_round === 5 && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h2 className="section-title">ROUND 5 CONCLUDED</h2>
              <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>If you are reading this, you are still alive.</p>
              <div className="loader-dots" style={{ margin: '2rem auto' }}><span></span><span></span><span></span></div>
              <p style={{ opacity: 0.7 }}>Preparing the final arena...</p>
            </div>
          )}

          {gameState.status === 'active' && user.role === 'volunteer' && gameState.current_round === 5 && (
            <Round5VolunteerView 
              games={round5Games}
              onDisqualify={disqualifyTeam5}
              onEndNow={endR5GameNow}
            />
          )}

          {user.role === 'volunteer' && gameState.status === 'waiting' && gameState.current_round === 5 && (
            <div className="card waiting-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <h2 className="section-title">THE PARADOX HAS ENDED</h2>
              <p>Waiting for the <strong>Game Master</strong> to activate the final arena: <strong>The Game of Hearts</strong>.</p>
            </div>
          )}

          {gameState.status === 'active' && gameState.current_round === 6 && round6State && (
            user.role === 'player' ? (
              <Round6PlayerView 
                state={round6State} 
                userId={user.id} 
                onVote={submitR6Vote}
              />
            ) : (
              <Round6VolunteerView 
                state={round6State}
                onStartTimer={startR6Timer}
                onResolve={resolveR6}
                onNext={nextR6Cycle}
                onFinish={finishR6}
              />
            )
          )}

          {gameState.status === 'active' && gameState.current_round === 7 && (
            !round7State ? (
              <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="loader-dots"><span></span><span></span><span></span></div>
                <h3>CONNECTING TO HEARTS ENGINE...</h3>
                <p style={{ opacity: 0.6 }}>Synchronizing game state...</p>
                <button onClick={() => ws?.send(JSON.stringify({ type: 'start_round_7' }))} style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.5, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                  Force Re-Sync (Admin Only)
                </button>
              </div>
            ) : (
             user.role === 'player' ? (
              <Round7PlayerView 
                state={round7State} 
                userId={user.id} 
                onAction={submitR7Action}
                logs={r7Logs}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', background: '#000', color: '#fff', border: '4px solid #fff', outline: '4px solid #000', marginTop: '2rem' }}>
                <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#00ff00' }}>
                  GHAR JAA TERO KAAM SAKKIYO
                </h3>
                <p style={{ fontSize: '1.2rem', opacity: 0.8, fontStyle: 'italic' }}>
                  (Go home, your work is done.)
                </p>
                <p style={{ marginTop: '1.5rem', opacity: 0.7 }}>
                  Round 7 is running autonomously. You are dismissed.
                </p>
              </div>
            )
          )
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
                  {gameState.current_round === 6 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#000', color: '#fff', border: '4px solid #fff', outline: '4px solid #000', marginTop: '2rem' }}>
                      <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#00ff00' }}>
                        GHAR JAA TERO KAAM SAKKIYO
                      </h3>
                      <p style={{ fontSize: '1.2rem', opacity: 0.8, fontStyle: 'italic' }}>
                        (Go home, your work is done.)
                      </p>
                      <p style={{ marginTop: '1.5rem', opacity: 0.7 }}>
                        The system will handle the Final Round automatically (or mostly). Good job.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '1rem' }}>
                        ROUND {gameState.current_round} FINALIZED
                      </p>
                      <p style={{ opacity: 0.7 }}>Awaiting next phase instructions from the Game Master...</p>
                    </>
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
                        {lotteryPool.filter(c => !c.is_taken).map(card => (
                          <div 
                            key={card.id} 
                            className="lottery-card"
                            onClick={() => selectCard(card.id)}
                          >
                            <div className="card-inner">
                              <div className="card-front">?</div>
                              <div className="card-back"></div>
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
            <div className="card waiting-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="loader-dots"><span></span><span></span><span></span></div>
              <h2 className="section-title">ROUND 2: LOTTERY</h2>
              <p>Lottery is currently in progress. Players are selecting their fate.</p>
              <p style={{ marginTop: '1.5rem', opacity: 0.6 }}>Waiting for game master to stop the lottery and eliminate single players.</p>
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
                  {gameState.current_round === 1 && (
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

                  {gameState.current_round === 2 && (
                    <>
                      <h2 className="section-title">R2 LOTTERY STATUS</h2>
                      <div className="volunteer-data-list">
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '1rem' }}>
                          Current Round: {gameState.status.toUpperCase()}
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

                   {gameState.current_round === 3 && (
                    <>
                      <h2 className="section-title">R3 DUEL MONITOR</h2>
                      <div className="volunteer-data-list">
                        <div className="data-items">
                          {round3Matches.map(m => {
                            const isFinished = m.status === 'finished';
                            const getStatusColor = (scores: any, isLuckyPassSlot: boolean, hasOpponent: boolean) => {
                              if (!isFinished) return 'inherit';
                              if (isLuckyPassSlot) return '#888'; 
                              if (!hasOpponent) return '#00cc00'; 
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
                                <span style={{ 
                                  color: m.status === 'active' ? '#00ff00' : 
                                         m.status === 'finished' ? (
                                           (() => {
                                             if (!m.team2_id) return '#00cc00'; 
                                             const t1Positives = Array.isArray(m.team1_scores) ? m.team1_scores.filter((s: boolean) => s === true).length : 0;
                                             return t1Positives >= 2 ? '#00cc00' : '#ff4444';
                                           })()
                                         ) : '#888',
                                  fontSize: '0.7rem' 
                                }}>
                                  {m.status.toUpperCase()}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.2rem' }}>
                                Ref: {m.volunteer_name || 'NONE'} | Subround: {m.current_subround}/3
                              </div>
                            </div>
                            );
                          })}
                          {round3Matches.length === 0 && <p className="empty">No active duels found.</p>}
                        </div>
                      </div>
                    </>
                  )}

                   {gameState.current_round === 4 && (
                    <>
                      <h2 className="section-title">R4 EVALUATION MONITOR</h2>
                      <div className="volunteer-data-list">
                        <div className="data-items">
                          {round4Sessions.map(s => (
                            <div key={s.id} className="data-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <div>
                                  <div>{s.team_name}</div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.2rem' }}>
                                    {s.user1_name}, {s.user2_name}
                                  </div>
                                </div>
                                <span style={{ 
                                  color: s.status === 'waiting' ? '#f59e0b' : s.status === 'active' ? '#3b82f6' : '#6b7280',
                                  fontSize: '0.7rem' 
                                }}>
                                  {s.status.toUpperCase()}
                                </span>
                              </div>
                              {s.status === 'finished' && (
                                <div style={{ 
                                  fontSize: '0.8rem', 
                                  fontWeight: 'bold',
                                  color: s.result === 'pass' ? '#10b981' : '#ef4444',
                                  marginTop: '0.3rem'
                                }}>
                                  {s.result === 'pass' ? '✓ PASSED' : '✗ FAILED'}
                                </div>
                              )}
                              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.2rem' }}>
                                Evaluator: {s.volunteer_name || 'NONE'}
                              </div>
                            </div>
                          ))}
                          {round4Sessions.length === 0 && <p className="empty">No evaluation sessions found.</p>}
                        </div>
                      </div>
                    </>
                  )}

                   {gameState.current_round === 5 && (
                    <>
                      <h2 className="section-title">R5 PARADOX MONITOR</h2>
                      <div className="volunteer-data-list">
                        <div className="data-items">
                          {round5Games.map(g => (
                            <div key={g.id} className="data-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <div>
                                  <div>{g.team_a_name} vs {g.team_b_name || 'BYE'}</div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.2rem' }}>
                                    Momentum: {g.team_a_momentum} - {g.team_b_momentum} | Round: {g.current_round}/9
                                  </div>
                                </div>
                                <span style={{ 
                                  color: g.status === 'waiting' ? '#f59e0b' : g.status === 'active' ? '#3b82f6' : '#6b7280',
                                  fontSize: '0.7rem' 
                                }}>
                                  {g.status.toUpperCase()}
                                </span>
                              </div>
                              {g.status === 'finished' && (
                                <div style={{ 
                                  fontSize: '0.8rem', 
                                  fontWeight: 'bold',
                                  color: '#10b981',
                                  marginTop: '0.3rem'
                                }}>
                                  Result: {g.result}
                                </div>
                              )}
                            </div>
                          ))}
                          {round5Games.length === 0 && <p className="empty">No active Paradox games found.</p>}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {gameState.current_round === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <h3>WAITING FOR GAME START</h3>
                      <p>Automation will activate once Round 1 begins.</p>
                    </div>
                  )}

                  {gameState.current_round >= 6 && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <h3>FINAL ROUND ACTIVE</h3>
                      <p>Monitoring is now handled via the main interface.</p>
                    </div>
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

        .approve-btn {
          background: #00ff00;
          color: black;
          border: 3px solid black;
          padding: 12px;
          font-weight: 900;
          box-shadow: 4px 4px 0px 0px black;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.1s;
        }

        .approve-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0px 0px black;
        }

        .terminate-btn {
          background: #ff4444;
          color: white;
          border: 3px solid black;
          padding: 12px;
          font-weight: 900;
          box-shadow: 4px 4px 0px 0px black;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.1s;
        }

        .terminate-btn:active {
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

// ROUND 6 COMPONENTS

// ROUND 6 COMPONENTS (THE GAME OF HEARTS)

function Round6History({ history }: { history: any[] }) {
  if (history.length === 0) return null;
  return (
    <div className="admin-card" style={{ marginTop: '1rem', background: '#f8f8f8' }}>
      <h4 className="section-title">ELIMINATION HISTORY</h4>
      <div className="admin-user-list">
        {history.map((h, idx) => {
          const isStandoff = h.reason === 'standoff';
          return (
            <div key={idx} className="admin-user-item" style={{ borderLeft: isStandoff ? '4px solid #fbbf24' : '4px solid #ff4444' }}>
              <div className="admin-user-info">
                {isStandoff ? (
                  <strong>STANDOFF REACHED</strong>
                ) : (
                  <strong>{h.target_name} eliminated</strong>
                )}
                {h.partner_name && <small>Collateral: {h.partner_name} (Pigeon Rule)</small>}
                <small>Cycle {h.subround} | {isStandoff ? 'VOTES EQUALIZED' : `Reason: ${h.reason.toUpperCase()}`}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Round6PlayerView({ 
  state, 
  userId, 
  onVote 
}: { 
  state: any, 
  userId: string,
  onVote: (targetId: string, safety: boolean) => void
}) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [useSafety, setUseSafety] = useState<boolean>(false);
  
  const me = state.players.find((p: any) => p.id === userId);
  const myVote = state.votes?.find((v: any) => v.voter_id === userId);
  const isDead = me?.is_eliminated;

  // Update useSafety if they already cast a vote with safety in this subround
  useEffect(() => {
    if (myVote) {
      setUseSafety(!!myVote.used_safety);
      setSelectedTarget(myVote.target_id);
    }
  }, [myVote]);

  if (isDead) {
    return (
      <div className="player-view">
        <div className="instruction-box" style={{ background: '#ff4444' }}>
          <h3>DE-CALIBRATED</h3>
          <p>You are no longer an active variable in this trial.</p>
        </div>
        <Round6History history={state.history} />
      </div>
    );
  }

  const alreadyUsedSafetyInPast = me?.has_used_safety && !myVote?.used_safety;

  return (
    <div className="player-view">
      <div className="instruction-box">
        <h3>ROUND 6: THE PIGEON ROUND</h3>
        <p>Variable Elimination Protocol Engaging. Choose a target. If your target is eliminated, their unit partner is also purged.</p>
        {state.status === 'voting' && (
          <p style={{ color: '#4ade80', fontWeight: 'bold' }}>VOTING IN PROGRESS</p>
        )}
      </div>

      {state.status === 'voting' && (
        <div className="admin-card">
          <h4 className="section-title">ACTIVE TARGETS</h4>
          {myVote && (
            <div style={{ background: '#000', color: '#fff', padding: '10px', marginBottom: '1rem', fontWeight: 'bold' }}>
              VOTE RECORDED: {state.players.find((p: any) => p.id === myVote.target_id)?.name || 'UNKNOWN'}
              {myVote.used_safety && <span style={{ color: '#00ff00', marginLeft: '10px' }}>[SAFETY ACTIVE]</span>}
            </div>
          )}
          <div className="player-list">
            {state.players.filter((p: any) => !p.is_eliminated && p.id !== userId).map((p: any) => (
              <div 
                key={p.id} 
                className={`player-item ${selectedTarget === p.id || myVote?.target_id === p.id ? 'selected' : ''}`}
                onClick={() => setSelectedTarget(p.id)}
              >
                {p.name} {myVote?.target_id === p.id && ' (YOUR TARGET)'}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '15px', border: '2px dashed black', background: '#f0f0f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: alreadyUsedSafetyInPast ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
              <input 
                type="checkbox" 
                checked={useSafety} 
                disabled={alreadyUsedSafetyInPast}
                onChange={(e) => setUseSafety(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              {alreadyUsedSafetyInPast ? 'SAFETY CARD ALREADY EXHAUSTED' : 'APPLY SAFETY CARD (One-time use)'}
            </label>
            <p style={{ fontSize: '0.7rem', marginTop: '5px', opacity: 0.7 }}>
              Safety prevents your elimination even if you are the top-voted target this cycle.
            </p>
          </div>

          <button 
            className="primary-btn" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={!selectedTarget || (myVote?.target_id === selectedTarget && myVote?.used_safety === useSafety)}
            onClick={() => {
              if (selectedTarget) onVote(selectedTarget, useSafety);
            }}
          >
            {myVote ? 'UPDATE VOTE/SAFETY' : 'CONFIRM VOTE'}
          </button>
        </div>
      )}

      {state.status !== 'voting' && (
        <div className="instruction-box" style={{ background: '#333' }}>
          <p>WAITING FOR NEXT CYCLE...</p>
        </div>
      )}

      <Round6History history={state.history} />
    </div>
  );
}

function Round6VolunteerView({ 
  state, 
  onStartTimer, 
  onResolve, 
  onNext,
  onFinish 
}: { 
  state: any, 
  onStartTimer: () => void, 
  onResolve: () => void,
  onNext: () => void,
  onFinish: () => void
}) {
  return (
    <div className="volunteer-view" style={{ padding: '1rem' }}>
      <div className="admin-card">
        <h3>PIGEON ROUND CONTROL</h3>
        <p>Cycle: {state.current_cycle} | Status: {state.status.toUpperCase()}</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '1rem' }}>
          <button className="primary-btn" onClick={onStartTimer} disabled={state.status === 'voting'}>START VOTING</button>
          <button className="primary-btn" style={{ background: state.status === 'voting' ? '#ffaa00' : '' }} onClick={() => {
            if (window.confirm("RESOLVE NOW? This will eliminate the top-voted player AND any players who failed to vote.")) {
              onResolve();
            }
          }} disabled={state.status !== 'voting'}>RESOLVE & PURGE</button>
          <button className="primary-btn" onClick={onNext} disabled={state.status !== 'finished'}>NEXT CYCLE</button>
          <button className="primary-btn" style={{ background: '#ff4444' }} onClick={onFinish}>FINISH ROUND</button>
        </div>
        {state.status === 'voting' && (
          <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#ff4444', fontWeight: 'bold' }}>
            ⚠️ WARNING: Resolving will automatically eliminate all players marked "WAITING..." below.
          </p>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: '1rem' }}>
        <h4 className="section-title">LIVE VOTES ({state.votes.length})</h4>
        <div className="admin-user-list">
          {state.players.filter((p: any) => !p.is_eliminated).map((p: any) => {
             const vote = state.votes.find((v: any) => v.voter_id === p.id);
             return (
               <div key={p.id} className="admin-user-item">
                 <div className="admin-user-info">
                   <strong>{p.name}</strong>
                   <small>{vote ? `Voted for ${state.players.find((t: any) => t.id === vote.target_id)?.name || '?'}` : 'WAITING...'}</small>
                 </div>
               </div>
             )
          })}
        </div>
      </div>

      <Round6History history={state.history} />
    </div>
  );
}

function Round7PlayerView({ state, userId, onAction, logs }: { 
  state: any; 
  userId: string; 
  onAction: (action: string, targetId?: string) => void;
  logs: string[];
}) {
  const me = state.players.find((p: any) => p.user_id === userId);
  const alivePlayers = state.players.filter((p: any) => p.is_alive);
  const others = alivePlayers.filter((p: any) => p.user_id !== userId);

  if (!me) return <div className="card">CALIBRATING HEARTS...</div>;

  if (!me.is_alive) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', border: '5px solid #ff4444' }}>
        <h1 style={{ fontSize: '4rem', color: '#ff4444', marginBottom: '1rem' }}>ELIMINATED</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>Your heart has stopped beating. You are no longer part of this game.</p>
      </div>
    );
  }

  if (state.status === 'finished') {
    const won = state.winner_id === userId;
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', border: won ? '5px solid #00ff00' : '5px solid #000' }}>
        <h1 style={{ fontSize: '4rem', color: won ? '#00ff00' : '#000' }}>{won ? 'CHAMPION' : 'GAME OVER'}</h1>
        <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{won ? 'YOU ARE THE LAST ONE STANDING.' : 'A WINNER HAS BEEN DECIDED.'}</p>
      </div>
    );
  }


  return (
    <div className="card" style={{ padding: '2rem', border: '4px solid black' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '900', margin: 0 }}>ROUND 6: THE GAME OF HEARTS</h2>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>CYCLE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{state.current_cycle}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', background: '#f8f9fa', padding: '1.5rem', border: '3px solid black' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>YOUR STATUS</div>
          <div style={{ fontSize: '3rem', fontWeight: '900' }}>{'❤️'.repeat(me.hearts)}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{me.hearts} HEARTS</div>
        </div>
        {me.teammate_id && (
          <div style={{ textAlign: 'center', flex: 1, borderLeft: '2px solid black' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>PARTNER</div>
            <div style={{ fontWeight: 'bold' }}>{state.players.find((p:any)=>p.user_id === me.teammate_id)?.name || 'UNKNOWN'}</div>
            <div>{state.players.find((p:any)=>p.user_id === me.teammate_id)?.is_alive ? '❤️'.repeat(state.players.find((p:any)=>p.user_id === me.teammate_id)?.hearts) : '💀 DEAD'}</div>
          </div>
        )}
      </div>

      {state.status === 'waiting' ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: 'black', color: 'white' }}>
          <div className="loader-dots"><span></span><span></span><span></span></div>
          <h3 style={{ fontSize: '1.2rem', letterSpacing: '2px' }}>AWAITING NEXT CYCLE...</h3>
        </div>
      ) : me.current_action ? (
        <div style={{ textAlign: 'center', padding: '2rem', border: '3px dashed black' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>ACTION RECORDED</h3>
          <p style={{ fontSize: '1.5rem', margin: '1rem 0' }}>{me.current_action}: {state.players.find((p:any)=>p.user_id === me.target_id)?.name || 'NONE'}</p>
          <p style={{ opacity: 0.6 }}>Waiting for others to act...</p>
        </div>
      ) : (
        <div>
          <h3 style={{ fontWeight: '900', marginBottom: '1.5rem', borderBottom: '2px solid black', display: 'inline-block' }}>CHOOSE YOUR ACTION</h3>
          
          {others.length === 1 && state.players.filter((p:any)=>p.is_alive).length === 2 ? (
            <div style={{ textAlign: 'center', background: 'black', color: 'white', padding: '2rem' }}>
              <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>FINAL DUEL</h1>
              <p style={{ marginBottom: '2rem', opacity: 0.8 }}>HEARTS BALANCED. CHOOSE THE FINAL OUTCOME.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <button 
                  onClick={() => onAction('PROTECT', others[0].user_id)}
                  style={{ padding: '2rem', border: '4px solid white', background: 'transparent', color: 'white', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer' }}
                > PROTECT OTHER FRIEND </button>
                <button 
                  onClick={() => onAction('BETRAY', others[0].user_id)}
                  style={{ padding: '2rem', border: 'none', background: '#c53030', color: 'white', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer' }}
                > BETRAY </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ border: '2px solid black', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontWeight: '900' }}>BETRAY</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {others.map((p:any) => (
                    <button key={p.user_id} onClick={() => onAction('BETRAY', p.user_id)} style={{ padding: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', border: '2px solid black' }}>
                      BETRAY {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ border: '2px solid black', padding: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontWeight: '900' }}>PROTECT (Cost: 1 ❤️)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <button onClick={() => onAction('PROTECT', userId)} style={{ padding: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', border: '2px solid black' }}>
                    PROTECT SELF
                  </button>
                  {others.map((p:any) => (
                    <button key={p.user_id} onClick={() => onAction('PROTECT', p.user_id)} style={{ padding: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', border: '2px solid black' }}>
                      PROTECT {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {me.teammate_id && state.players.find((p:any)=>p.user_id === me.teammate_id)?.is_alive && (
                <>
                  <button 
                    onClick={() => onAction('SACRIFICE', me.teammate_id)}
                    disabled={me.hearts < 2}
                    style={{ 
                      padding: '1rem', 
                      background: me.hearts < 2 ? '#feb2b2' : '#c53030', 
                      color: 'white', 
                      border: 'none', 
                      fontWeight: '900', 
                      cursor: me.hearts < 2 ? 'not-allowed' : 'pointer',
                      opacity: me.hearts < 2 ? 0.7 : 1
                    }}
                  > SACRIFICE PARTNER (Cost: 2 ❤️) </button>
                  <button 
                    onClick={() => onAction('QUIT')}
                    style={{ padding: '1rem', background: '#4a5568', color: 'white', border: 'none', fontWeight: '900', cursor: 'pointer' }}
                  > QUIT (Eliminate Team) </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: '2.5rem', borderTop: '4px solid black', paddingTop: '1.5rem' }}>
          <h3 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '1rem' }}>LAST CYCLE RESULTS</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f8f9fa', padding: '1rem', border: '2px solid black', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {logs.map((log, i) => <div key={i} style={{ marginBottom: '4px' }}>{`> ${log}`}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Round7VolunteerView({ state, onStartVoting, onResolve, onReset, logs }: { 
  state: any; 
  onStartVoting: () => void; 
  onResolve: () => void;
  onReset: () => void;
  logs: string[];
}) {
  const alivePlayers = state.players.filter((p: any) => p.is_alive);
  const actingPlayers = state.players.filter((p: any) => p.is_alive && p.current_action).length;

  return (
    <div style={{ marginTop: '1rem' }}>
      <h2 className="section-title">HEARTS COMMAND CENTER</h2>
      
      <div className="card" style={{ padding: '2rem', border: '4px solid black', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>CURRENT STATUS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{state.status.toUpperCase()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>CYCLE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{state.current_cycle}</div>
             <button onClick={onReset} style={{ fontSize: '0.7rem', textDecoration: 'underline', background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}>Reset Cycle</button>
          </div>
        </div>

        {state.status === 'waiting' && (
          <button 
            onClick={onStartVoting}
            className="submit-btn" 
            style={{ width: '100%', padding: '1.5rem', fontSize: '1.2rem', background: 'black', color: 'white' }}
          >
            ▶️ START NEXT CYCLE
          </button>
        )}

        {state.status === 'acting' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '2px solid black', background: '#fafafa' }}>
              <div style={{ fontSize: '2rem', fontWeight: '900' }}>{actingPlayers} / {alivePlayers.length}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>PLAYERS HAVE ACTED</div>
            </div>
            <button 
              onClick={onResolve}
              className="submit-btn" 
              style={{ width: '100%', padding: '1.5rem', fontSize: '1.2rem', background: '#c53030', color: 'white' }}
            >
              ⚠️ RESOLVE CYCLE NOW
            </button>
          </div>
        )}

        {state.status === 'finished' && (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#000', color: '#fff', border: '4px solid #fff', outline: '4px solid #000' }}>
            <h3 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1rem 0', textTransform: 'uppercase', color: '#00ff00' }}>
              GHAR JAA TERO KAAM SAKKIYO
            </h3>
            <p style={{ fontSize: '1.2rem', opacity: 0.8, fontStyle: 'italic' }}>
              (Go home, your work is done.)
            </p>
            <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid #333' }}>
              <p style={{ margin: 0, fontWeight: 'bold' }}>CHAMPION DECLARED:</p>
              <p style={{ fontSize: '2rem', margin: '0.5rem 0', color: '#4ade80' }}>
                {state.players.find((p:any)=>p.user_id === state.winner_id)?.name || 'NONE'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '1.5rem', border: '2px solid black' }}>
        <h3 style={{ fontWeight: '900', marginBottom: '1rem' }}>LIVING PLAYERS MONITOR</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {alivePlayers.map((p: any) => (
            <div key={p.user_id} style={{ padding: '10px', border: '2px solid black', background: p.current_action ? '#ebffeb' : '#fff' }}>
              <div style={{ fontWeight: 'bold' }}>{p.name}</div>
              <div style={{ color: p.hearts <= 1 ? '#ff4444' : 'inherit' }}>{'❤️'.repeat(p.hearts)} ({p.hearts})</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>
                {p.current_action ? `ACTED: ${p.current_action}` : 'WAITING...'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {logs.length > 0 && (
        <div className="card" style={{ marginTop: '2rem', padding: '1.5rem', border: '2px solid black' }}>
          <h3 style={{ fontWeight: '900', marginBottom: '1rem' }}>CYCLE LOGS</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8f9fa', padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {logs.map((log, i) => <div key={i} style={{ marginBottom: '4px' }}>{`> ${log}`}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

