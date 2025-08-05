import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SubNavBar.css';

function SubNavBar() {
  const location = useLocation();
  const userId = localStorage.getItem("userId");  // ✅ 从 localStorage 读取用户 ID

  return (
    <>
      <hr className="subnav-divider" />
      <div className="top-nav-bar">
        <Link to="/home" className={`nav-tab ${location.pathname === '/home' ? 'active' : ''}`}>
          🏠 Back homepage
        </Link>
        <Link to="/itinerary" className={`nav-tab ${location.pathname === '/itinerary' ? 'active' : ''}`}>
          📅 My Itinerary
        </Link>
        <Link
          to={userId ? `/accommodation/${userId}` : "#"}  // ✅ 拼接用户ID
          className={`nav-tab ${location.pathname === `/accommodation/${userId}` ? 'active' : ''}`}
        >
          🛏️ Accommodation
        </Link>
        <Link
          to={userId ? `/packing/${userId}` : "#"}  // ✅ 拼接用户ID
          className={`nav-tab ${location.pathname === `/packing/${userId}` ? 'active' : ''}`}
        >
          🧾 Packing List
        </Link>
        <Link
          to={userId ? `/members/${userId}` : "#"}  // ✅ 拼接用户ID
          className={`nav-tab ${location.pathname === `/members/${userId}` ? 'active' : ''}`}
        >
          🧑‍🤝‍🧑 Members
        </Link>
        <Link
          to={userId ? `/splitwise/${userId}` : "#"}  // ✅ 拼接用户ID
          className={`nav-tab ${location.pathname === `/splitwise/${userId}` ? 'active' : ''}`}
        >
          💰 Splitwise
        </Link>
      </div>
    </>
  );
}

export default SubNavBar;
