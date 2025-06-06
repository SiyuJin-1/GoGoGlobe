// Register.js
import React, { useState } from 'react';
import './Register.css';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage('Registered successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } else {
      setMessage('Your Signup Failed：' + data.error);
    }
  };

    const handleGoogleSignIn = () => {
    window.location.href = 'https://86fb-2601-646-8981-83c0-419-8e0c-34a4-4b09.ngrok-free.app/api/auth/google';
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
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Create Free Account</button>
        </form>
        <div className="message">{message}</div>
        <div className="divider">or</div>
        <div className="google-login" onClick={handleGoogleSignIn}>
        <img src= "/images/web_light_rd_SU@1x.png" alt="Google" className="google-icon" />
        </div>

        <div className="divider">Already have an account?</div>
        <Link to="/login" className="login-link">Back to Sign in</Link>
      </div>
    </div>
  );
}

export default Register;
