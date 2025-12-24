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
  email?: string;
  role?: string;
  is_eliminated?: boolean;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  is_eliminated?: boolean;
}

interface GameState {
  current_round: number;
  status: 'waiting' | 'active' | 'finished';
  is_sudden_death?: boolean;
}

interface Round3Match {
  id: string;
  team1_id: string;
  team1_name: string;
  team1_user1: string;
  team1_user2: string;
  team1_scores: boolean[];
  team2_id?: string;
  team2_name?: string;
  team2_user1?: string;
  team2_user2?: string;
  team2_scores: boolean[];
  volunteer_id?: string;
  volunteer_name?: string;
  status: 'waiting' | 'active' | 'finished';
  current_subround: number;
  winner_name?: string;
  winner_team_id?: string;
}

interface Round4Session {
  id: string;
  team_id: string;
  team_name: string;
  user1_id: string;
  user1_name: string;
  user2_id: string;
  user2_name: string;
  volunteer_id?: string;
  volunteer_name?: string;
  status: 'waiting' | 'active' | 'finished';
  result?: 'pass' | 'fail';
  user1_eliminated?: boolean;
  user2_eliminated?: boolean;
}

interface Round5Game {
  id: string;
  team_a_id: string;
  team_a_name: string;
  team_a_user1: string;
  team_a_user2: string;
  team_a_momentum: number;
  team_a_turn_order?: string[];
  team_a_pact_used?: string;
  team_b_id?: string;
  team_b_name?: string;
  team_b_user1?: string;
  team_b_user2?: string;
  team_b_momentum: number;
  team_b_turn_order?: string[];
  team_b_pact_used?: string;
  status: 'waiting' | 'active' | 'finished';
  result?: 'team_a_win' | 'team_b_win' | 'both_win' | 'both_lose';
  current_round: number;
  subround_started_at: string;
  is_sudden_death: boolean;
  turns: {
    player_id: string;
    team: 'A' | 'B';
    card_selected: 'ATTACK' | 'FORTIFY' | 'CONVERGE';
    pact_used?: string;
    round_number: number;
    is_revealed: boolean;
  }[];
}

interface Round6State {
  status: 'waiting' | 'voting' | 'finished';
  current_cycle: number;
  players: {
    id: string;
    name: string;
    is_eliminated: boolean;
    has_used_safety: boolean;
  }[];
  votes: {
    voter_id: string;
    target_id: string;
    used_safety: boolean;
  }[];
  history: {
    subround: number;
    target_name?: string;
    partner_name?: string;
    reason: string;
  }[];
}

interface Round7State {
  status: 'waiting' | 'active' | 'finished';
  current_cycle: number;
  players: {
    user_id: string;
    name: string;
    hearts: number;
    is_alive: boolean;
    teammate_id?: string;
    current_action?: string;
    target_id?: string;
  }[];
  winner_id?: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_eliminated: boolean;
}

interface AdminTeam {
  id: string;
  name: string;
  user1_id: string;
  user1_name: string;
  user1_eliminated: boolean;
  user2_id: string;
  user2_name: string;
  user2_eliminated: boolean;
}

interface AdminViewProps {
  gameState: GameState;
  leaderboard: Player[];
  adminUsers: AdminUser[];
  adminTeams: AdminTeam[];
  round3Matches: Round3Match[];
  round4Sessions: Round4Session[];
  round5Games: Round5Game[];
  onEliminateUser: (userId: string) => void;
  onReviveUser: (userId: string) => void;
  onEliminateTeam: (teamId: string) => void;
  onReviveTeam: (teamId: string) => void;
  onStartRound: (round: number) => void;
  onFinishRound: (round: number) => void;
  onStartRound2: () => void;
  onStartRound3: () => void;
  onFinishRound3: () => void;
  onStartRound4: () => void;
  onFinishRound4: () => void;
  onStartRound5: () => void;
  onFinishRound5: () => void;
  onStartRound6: () => void;
  onStartRound7: () => void;
  onFinishRound6: () => void;
  onResetRound: (round: number) => void;
}

const getRandomMessage = (messages: string[]) => {
  return messages[Math.floor(Math.random() * messages.length)];
};

const WINNER_MESSAGES = [
  "Tujhe toh agli baar main dekhlunga...",
  "Don't be so happy, it's just luck.",
  "Lucky coincidence? We'll see.",
  "Enjoy your 5 seconds of fame.",
  "Almost competent. Almost.",
  "Tujhse thoda zyada umeed thi, par theek hai.",
  "Surviving isn't winning. Yet.",
  "Don't get used to the safety.",
  "Your partner carried you, didn't they?",
  "Calibration success... for now.",
  "Beta, luck hamesha saath nahi deta.",
  "Safe? For now. Next time? Probably a grave.",
  "Dank level: 1/100. Survival level: 100/100.",
  "Beginner's luck activated. Don't let it go to your head.",
  "You won? The system must be feeling generous today.",
  "Congrats on not being the weakest link... this time.",
  "Victory achieved. Error rate: Still 99%.",
  "You survived. Color me mildly surprised.",
  "One win doesn't make you good. It makes us suspicious.",
  "Fluke detected. Reverting to reality next round.",
  "Enjoy it while it lasts. Mediocrity returns shortly.",
  "The algorithm blinked. That's the only explanation.",
  "You peaked. It's all downhill from here.",
  "Temporary admin privileges granted. Revoking soon.",
  "Won the battle, still losing the war against competence."
];

const LOSER_MESSAGES = [
  "Absolute dogwater performance.",
  "Uninstalling your importance...",
  "Brutal. Honestly just embarrassing.",
  "Your parents deserve an apology.",
  "Go back to Tutorial Island.",
  "Skill issue detected: Life deleted.",
  "Imagine losing this early. Pathetic.",
  "Dank meme banne ke layak bhi nahi ho.",
  "Ghar ja beta, coding seekh le pehle.",
  "Worthless. Discarded. Forgotten.",
  "Tu variable bhi nahi, tu runtime error hai.",
  "Aukat dikha di system ne.",
  "Your existence is a bug the system finally patched.",
  "Error 404: Skill not found.",
  "Garbage collection in progress... it's targeting you.",
  "Even a random() function has more value than this.",
  "Process terminated. Reason: Extreme incompetence.",
  "You're the reason we can't have nice things.",
  "Your performance just broke the embarrassment meter.",
  "Selection sort would've eliminated you faster.",
  "Zero impact, zero skill, zero comeback.",
  "The system has no mercy for units like you.",
  "You were the 'Hello World' of disappointment.",
  "Access denied. Permanently. Try existing better next life.",
  "Out of memory. Out of talent. Out of excuses.",
  "You didn't last this round, that's why she left you.",
  "Your Git history is cleaner than your gameplay — it's empty.",
  "Even AI refuses to carry you after seeing this.",
  "You're not bad, you're statistically significant proof of failure.",
  "Bro tried to flex... and pulled a muscle in confidence.",
  "Your comeback story starts with 'Once upon a never'."
];

const WAITING_MESSAGES = [
  "Calibrating your inevitable failure...",
  "Searching for your lost brain cells...",
  "The system is judging your every breath.",
  "Your silence is appreciated. Your existence, not so much.",
  "Waiting for someone to make a mistake. Probably you.",
  "Loading... just like your career prospects.",
  "Patience is a virtue you clearly don't have.",
  "Analyzing the depth of your mediocrity.",
  "Don't blink. The end is near.",
  "Your fate is being decided by a superior algorithm.",
  "Buffering your disappointment in 4K.",
  "Predicting next move... yep, it's another blunder.",
  "The suspense is killing me. Please hurry up and lose.",
  "Scanning for talent... scan complete: nothing found.",
  "Your turn. Try not to disappoint the universe again.",
  "Processing your excuses in advance.",
  "Queue position: Right behind 'hopeless'.",
  "Loading next L... estimated time: any second now.",
  "The calm before your storm of failure.",
  "Holding pattern activated. Crash landing imminent."
];

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

function Round3PlayerView({ userId, matches, isEliminated, randomQuote }: { userId: string; matches: Round3Match[]; isEliminated: boolean; randomQuote: string }) {
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
                        <h3 style={{ color: '#00ff00', fontSize: '1.5rem', marginBottom: '1.5rem' }}>{getRandomMessage(WINNER_MESSAGES)}</h3>
                        <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '80%', margin: '0 auto 2rem' }}>You survived the physical trials. Don't let it go to your head.</p>
                        <div style={{ padding: '15px 30px', border: '2px solid #00ff00', color: '#00ff00', display: 'inline-block', fontWeight: 'bold', letterSpacing: '2px' }}>
                          STATUS: TEMPORARILY ALIVE
                        </div>
                      </div>
                    ) : (
                      <div className="defeat-announcement">
                        <div style={{ color: '#ff4444', fontSize: '4rem', fontWeight: 'bold', textShadow: '0 0 20px rgba(255,0,0,0.4)', marginBottom: '0.5rem' }}>DEFEAT</div>
                        <h3 style={{ color: '#ff4444', fontSize: '1.5rem', marginBottom: '1.5rem' }}>{getRandomMessage(LOSER_MESSAGES)}</h3>
                        <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '80%', margin: '0 auto 2rem' }}>
                          {positives === 0 ? "Purged for total incompetence." : "Not enough talent to stay in the system."}
                        </p>
                        <div style={{ padding: '15px 30px', border: '2px solid #ff4444', color: '#ff4444', display: 'inline-block', fontWeight: 'bold', letterSpacing: '2px' }}>
                          STATUS: TRASH DISCARDED
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
              <p style={{ opacity: 0.7 }}>{getRandomMessage(WAITING_MESSAGES)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Round3VolunteerView({ volunteerId, matches, onJoin, onScore, onDisqualify }: { 
  volunteerId: string; 
  matches: Round3Match[]; 
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

function Round4PlayerView({ session, isEliminated }: { session: Round4Session; isEliminated: boolean }) {
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
        <p>{getRandomMessage(WAITING_MESSAGES)}</p>
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
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{getRandomMessage(WINNER_MESSAGES)}</h1>
          <p style={{ fontSize: '1.5rem', opacity: 0.9 }}>You've proven you're not completely useless. Yet.</p>
          <p style={{ fontSize: '1.1rem', opacity: 0.7, marginTop: '1rem' }}>DON'T GET COMFORTABLE. I'LL SEE YOU IN THE NEXT ROUND.</p>
        </div>
      );
    } else {
      return (
        <div className="defeat-screen" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💀</div>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ff4444' }}>INCOMPETENT</h1>
          <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>{getRandomMessage(LOSER_MESSAGES)}</p>
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
      <p style={{ fontSize: '1.1rem', opacity: 0.7 }}>{getRandomMessage(WAITING_MESSAGES)}</p>
    </div>
  );
}

function Round4VolunteerView({ sessions, volunteerId, onJoinSession, onEvaluate }: {
  sessions: Round4Session[];
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
            NO TEAMS IN EVALUATION QUEUE
          </div>
        )}
      </div>
    </div>
  );
}


function Round5PlayerView({ 
  game, 
  userId, 
  onSelectCard 
}: { 
  game: Round5Game; 
  userId: string;
  onSelectCard: (card: 'ATTACK' | 'FORTIFY' | 'CONVERGE', pact?: string) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [selectedPact, setSelectedPact] = useState<string | undefined>(undefined);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!game || game.status !== 'active') return;
    
    const updateTimer = () => {
      const start = new Date(game.subround_started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      
      const currentRoundTurns = (game.turns ?? []).filter((t) => t.round_number === game.current_round);
      const revealed = currentRoundTurns.length > 0 && currentRoundTurns.every((t) => t.is_revealed);
      
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
        <p>{getRandomMessage(WAITING_MESSAGES)}</p>
      </div>
    );
  }

  const isTeamA = game.team_a_user1 === userId || game.team_a_user2 === userId;
  const myTeam = isTeamA ? 'A' : 'B';
  const myMomentum = isTeamA ? game.team_a_momentum : game.team_b_momentum;
  const opponentMomentum = isTeamA ? game.team_b_momentum : game.team_a_momentum;
  const turnOrder = isTeamA ? game.team_a_turn_order : game.team_b_turn_order;
  
  const isMyTurn = game.current_round === 1 || (turnOrder && turnOrder[(game.current_round - 1) % 2] === userId);
  
  const currentRoundTurns = (game.turns ?? []).filter((t) => t.round_number === game.current_round);
  const myTurn = currentRoundTurns.find((t) => t.player_id === userId);
  const bothSubmitted = currentRoundTurns.length === 2;
  const revealed = bothSubmitted && currentRoundTurns.every((t) => t.is_revealed);

  const pactOptions = [
    { id: 'reduce_penalty', label: '🛡️ REDUCE PENALTY', desc: 'Convert penalty loss to -1' },
    { id: 'copy_opponent', label: '👥 COPY PREVIOUS', desc: 'Use opponent\'s last card' },
    { id: 'ignore_negative', label: '🚫 IGNORE NEGATIVE', desc: 'Cancel any negative change' }
  ];

  const MATRIX: Record<string, Record<string, [number, number]>> = {
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
            <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{getRandomMessage(WINNER_MESSAGES)}</p>
            <p style={{ opacity: 0.7 }}>You survived the Paradox. Don't let it go to your head.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '4rem', color: '#ff4444' }}>DEFEAT</h1>
            <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>{getRandomMessage(LOSER_MESSAGES)}</p>
            <p style={{ opacity: 0.7 }}>The Paradox has consumed your low-tier logic.</p>
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
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentRoundTurns.find((t) => t.team === 'A')?.card_selected}</div>
              {currentRoundTurns.find((t) => t.team === 'A')?.pact_used && (
                <div style={{ fontSize: '0.6rem', color: '#ff4444' }}>PACT: {currentRoundTurns.find((t) => t.team === 'A')?.pact_used}</div>
              )}
            </div>
            <div style={{ fontSize: '2rem', color: '#444' }}>VS</div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#aaa' }}>TEAM B</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentRoundTurns.find((t) => t.team === 'B')?.card_selected}</div>
              {currentRoundTurns.find((t) => t.team === 'B')?.pact_used && (
                <div style={{ fontSize: '0.6rem', color: '#ff4444' }}>PACT: {currentRoundTurns.find((t) => t.team === 'B')?.pact_used}</div>
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
                onClick={() => onSelectCard(card as 'ATTACK' | 'FORTIFY' | 'CONVERGE', selectedPact)}
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
            .filter((t) => t && t.is_revealed)
            .sort((a, b) => (b.round_number || 0) - (a.round_number || 0))
            .map((t, _idx, arr) => {
            // Group turns by round
            if (t.team === 'B') return null;
            const roundNum = t.round_number;
            const turnA = t;
            const turnB = arr.find((alt) => alt.round_number === roundNum && alt.team === 'B');
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
          {(!Array.isArray(game.turns) || game.turns.filter((t) => t.is_revealed).length === 0) && (
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
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState('control');
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [dataSubTab, setDataSubTab] = useState('r3');
  const surviversCount = adminUsers.filter((u) => !u.is_eliminated && u.role === 'player').length;

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
                      ({adminTeams.filter((t) => !t.user1_eliminated && !t.user2_eliminated).length} Teams)
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
  games: Round5Game[];
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
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>YOUR STATUS</div>
                  <div style={{ fontSize: '3rem', fontWeight: '900' }}>{'❤️'.repeat(me.hearts)}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{me.hearts} HEARTS</div>
                </div>
                {me.teammate_id && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>PARTNER</div>
                    <div style={{ fontWeight: 'bold' }}>{state.players.find((p:any)=>p.user_id === me.teammate_id)?.name || 'UNKNOWN'}</div>
                    <div>{state.players.find((p:any)=>p.user_id === me.teammate_id)?.is_alive ? '❤️'.repeat(state.players.find((p:any)=>p.user_id === me.teammate_id)?.hearts) : '💀 DEAD'}</div>
                  </div>
                )}
              </div>

              {state.status === 'waiting' ? (
                <div style={{ textAlign: 'center', padding: '2rem', background: 'black', color: 'white' }}>
                  <div className="loader-dots"><span></span><span></span><span></span></div>
                  <h3 style={{ fontSize: '1.2rem', letterSpacing: '2px' }}>CALCULATING CYCLE...</h3>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
