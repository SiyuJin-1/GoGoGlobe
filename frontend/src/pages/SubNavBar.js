import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SubNavBar.css';

function SubNavBar() {
  const location = useLocation();

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
        <Link to="/accommodation" className={`nav-tab ${location.pathname === '/accommodation' ? 'active' : ''}`}>
          🛏️ Accommodation
        </Link>
        <Link to="/packing" className={`nav-tab ${location.pathname === '/packing' ? 'active' : ''}`}>
          🧾 Packing List
        </Link>
        <Link to="/members" className={`nav-tab ${location.pathname === '/members' ? 'active' : ''}`}>
          🧑‍🤝‍🧑 Members
        </Link>
        <Link to="/budget" className={`nav-tab ${location.pathname === '/budget' ? 'active' : ''}`}>
          💰 Budget
        </Link>
      </div>
    </>
  );
}

export default SubNavBar;
