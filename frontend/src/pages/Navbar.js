import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  return (
    <div className="navbar">
      <div className="logo">
        <Link to="/home">GoGoGlobe</Link></div>
      <div className="nav-links">
        <Link to="/summary-card">My Plan</Link>
        <Link to="/login">Sign Out</Link>
      </div>
    </div>
  );
}

export default Navbar;
