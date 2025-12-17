import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Game() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const socket = new WebSocket('ws://localhost:3000/ws');
    
    socket.onopen = () => {
      console.log('Connected to WS');
      socket.send(JSON.stringify({ type: 'ping' }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages(prev => [...prev, data]);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="container">
      <div className="nav">
        <div>BLINDTECH GAME</div>
        <div>
          <span>{user.name} ({user.role})</span>
          <button onClick={logout} style={{ marginLeft: '1rem' }}>LOGOUT</button>
        </div>
      </div>
      
      <div className="card">
        <h1 className="title">GAME AREA</h1>
        <p>Welcome to the game zone.</p>
        
        <div style={{ border: '3px solid black', padding: '1rem', marginTop: '1rem', height: '200px', overflowY: 'auto' }}>
          {messages.map((m, i) => (
            <div key={i}>{JSON.stringify(m)}</div>
          ))}
        </div>
        
        <button onClick={() => ws?.send(JSON.stringify({ type: 'action', payload: 'hello' }))} style={{ marginTop: '1rem' }}>
          SEND ACTION
        </button>
      </div>
    </div>
  );
}
