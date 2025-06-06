import React, { useState } from 'react';
import './Login.css';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage('✅ 登录成功！');
      localStorage.setItem("userId", data.userId);
      navigate('/Home');
    } else {
      setMessage('❌ 登录失败：' + data.error);
    }
  };
    const handleGoogleSignIn = () => {
    window.location.href = 'https://86fb-2601-646-8981-83c0-419-8e0c-34a4-4b09.ngrok-free.app/api/auth/google';
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
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Sign In</button>
        </form>
        <div className="message">{message}</div>
        <div className="divider">or</div>
        <div className="google-login" onClick={handleGoogleSignIn}>
        <img src="/images/web_light_rd_SI@1x.png" alt="Google" className="google-icon" />
        </div>
        <div className="register-hint">
          Do not have account？<Link to="/register">Create free account</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
