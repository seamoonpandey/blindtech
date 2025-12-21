import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from './config';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('player');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        navigate('/game');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to register');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <h2 className="title" style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>JOIN_US</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem' }}>NAME</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@example.com" />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.3rem' }}>ROLE</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="player">PLAYER</option>
              <option value="volunteer">VOLUNTEER (GM)</option>
            </select>
          </div>
          <button type="submit" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }}>INITIALIZE.EXE</button>
        </form>
        <p style={{ marginTop: '2rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.9rem' }}>
          ALREADY REGISTERED? <Link to="/login" style={{ color: 'black' }}>LOGIN_HERE</Link>
        </p>
      </div>
    </div>
  );
}
