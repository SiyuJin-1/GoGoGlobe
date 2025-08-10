// src/pages/Register.js
import React, { useState } from 'react';
import './Register.css';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // 后端地址（没有代理时走这个）
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // 注册
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setMessage(`Your Signup Failed：${data?.error || 'unknown error'}`);
        setLoading(false);
        return;
      }

      // 确认会话，拿 userId
      const me = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      })
        .then(r => (r.ok ? r.json() : { user: null }))
        .catch(() => ({ user: null }));

      const id = me?.user?.id ?? data?.userId;
      if (id) {
        localStorage.setItem('userId', String(id));
        setMessage('Registered successfully! Redirecting...');
        setTimeout(() => navigate('/'), 500);
      } else {
        setMessage('Registered. Please sign in.');
        setTimeout(() => navigate('/login'), 800);
      }
    } catch (err) {
      console.error(err);
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // 直接跳后端的 Google OAuth 起点
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <h1>Create Free Account</h1>
        <p>Plan smart. Travel far. Remember forever.</p>

        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="E-mail Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Free Account'}
          </button>
        </form>

        <div className="message">{message}</div>

        <div className="divider">or</div>
        <div className="google-login" onClick={handleGoogleSignIn}>
          <img
            src="/images/web_light_rd_SU@1x.png"
            alt="Google"
            className="google-icon"
          />
        </div>

        <div className="divider">Already have an account?</div>
        <Link to="/login" className="login-link">Back to Sign in</Link>
      </div>
    </div>
  );
}
