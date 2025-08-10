// src/pages/Login.js
import React, { useState } from 'react';
import './Login.css';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      // 账号密码登录 —— 明确打到 3001
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setMessage(`❌ 登录失败：${data?.error || 'unknown error'}`);
        return;
      }

      // 再确认一次登录态并拿到 id
      const me = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
        .then(r => (r.ok ? r.json() : { user: null }))
        .catch(() => ({ user: null }));

      const id = me?.user?.id ?? data?.userId;
      if (id) {
        localStorage.setItem('userId', String(id));
        setMessage('✅ 登录成功！');
        navigate('/');
      } else {
        localStorage.removeItem('userId');
        setMessage('⚠️ 已登录但未获取到用户信息，请稍后再试');
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ 网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // Google 登录入口 —— 一定跳到 3001
  const handleGoogleSignIn = () => {
    window.location.assign(`${API_BASE}/api/auth/google`);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1>Welcome GoGoGlobe！</h1>
        <p>Plan smart. Travel far. Remember forever.</p>

        <form onSubmit={handleLogin}>
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
            autoComplete="current-password"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="message">{message}</div>

        <div className="divider">or</div>
        <button type="button" className="google-login" onClick={handleGoogleSignIn}>
          <img src="/images/web_light_rd_SI@1x.png" alt="Google" className="google-icon" />
        </button>

        <div className="register-hint">
          Do not have account？<Link to="/register">Create free account</Link>
        </div>
      </div>
    </div>
  );
}
