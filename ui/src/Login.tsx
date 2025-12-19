import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        navigate('/game');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to login');
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}>
        <h2 className="title" style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>LOGIN</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@example.com" />
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" style={{ width: '100%', padding: '15px', fontSize: '1.2rem' }}>ENTER.EXE</button>
        </form>
        <p style={{ marginTop: '2rem', textAlign: 'left', fontWeight: 'bold', fontSize: '0.9rem' }}>
          NEW USER? <Link to="/register" style={{ color: 'black' }}>REGISTER_HERE</Link>
        </p>
      </div>
    </div>
  );
}
