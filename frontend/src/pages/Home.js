// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import Navbar from './Navbar';
import Features from './Features';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // 进入页面时确保拿到 userId
  useEffect(() => {
    const ensureUserId = async () => {
      // 1) 先看 URL 是否带了 userId（Google 回调时会带）
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('userId');
      if (uid) {
        localStorage.setItem('userId', uid);
        console.log('✅ 从 URL 获取到 userId:', uid);
        // 清除查询参数，避免刷新重复解析
        window.history.replaceState({}, '', window.location.pathname);
        setChecking(false);
        return;
      }

      // 2) 如果 URL 没有，就调用后端 /api/auth/me 获取 session 中的用户
      try {
        const r = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        const d = await r.json();
        if (d?.user?.id) {
          localStorage.setItem('userId', String(d.user.id));
          console.log('✅ 从 /api/auth/me 获取到 userId:', d.user.id);
        } else {
          console.warn('⚠️ 未登录（/api/auth/me 返回空）');
        }
      } catch (e) {
        console.warn('⚠️ 获取登录态失败：', e);
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
              <h2>
                <span className="highlight">Plan together.</span> Remember forever.
              </h2>

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
