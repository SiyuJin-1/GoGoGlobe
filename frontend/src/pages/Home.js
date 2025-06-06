// src/pages/Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import './Home.css';
import Navbar from './Navbar';
import Features from './Features';


function Home() {
  const navigate = useNavigate();
useEffect(() => {
  const userId = localStorage.getItem("userId");
  if (userId) {
    console.log("✅ 当前用户ID：", userId);
  } else {
    console.warn("⚠️ 未登录");
  }
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
                <button className="primary-btn" onClick={() => navigate('/create')}>
                    Start a New Plan
                </button>
                <button className="secondary-btn" onClick={() => navigate('/plans')}>
                    View Existing Plans
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
