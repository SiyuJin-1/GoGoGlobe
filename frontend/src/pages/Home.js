// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import Navbar from './Navbar';
import Features from './Features';

const API_BASE = process.env.REACT_APP_API_BASE || "/api";

function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  // 1) 先看 URL 里是否带回了 ?userId=...
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const uid = p.get('userId');
    if (uid) {
      localStorage.setItem('userId', String(uid));
      setLoggedIn(true);
      // 清掉查询串，避免刷新后重复解析
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 2) 若本地没有 userId，再尝试通过会话接口获取
  useEffect(() => {
    const ensureUserId = async () => {
      let id = localStorage.getItem('userId');
      if (id) {
        setLoggedIn(true);
        setChecking(false);
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        const d = await r.json();
        if (d?.user?.id) {
          localStorage.setItem('userId', String(d.user.id));
          setLoggedIn(true);
          console.log('✅ get userId from /auth/me ：', d.user.id);
        } else {
          console.warn('⚠️ do not get userId from /auth/me');
        }
      } catch (e) {
        console.warn('⚠️ Failed to get login status：', e);
      } finally {
        setChecking(false);
      }
    };
    ensureUserId();
  }, []);

  return (
    <>
      <Navbar />
      <div className="home-container">
        <div className="main-content">
          <div className="left-panel">
            <div className="text-wrapper">
              <h1>Tired of chaotic travel planning?</h1>
              <h2><span className="highlight">Plan together.</span> Remember forever.</h2>

              <div className="button-row">
                <button
                  className="primary-btn"
                  onClick={() => navigate('/create')}
                  disabled={checking}
                >
                  {checking ? 'Checking…' : 'Start a New Plan'}
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => navigate('/summary-card')}
                  disabled={checking}
                >
                  {checking ? 'Loading…' : 'View Existing Plans'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Features />
    </>
  );
}

export default Home;
