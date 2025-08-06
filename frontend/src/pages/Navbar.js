import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Navbar.css';

function Navbar() {
  const userId = localStorage.getItem("userId"); // 或者从上下文中获取
  
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  const fetchUnread = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/notification/user/${userId}/unread-count`);
      const data = await res.json();
      setUnreadCount(data.count);
      console.log("🔢 未读数量：", data);

    } catch (err) {
      console.error("❌ 获取未读通知数量失败", err);
    }
  };

  fetchUnread();
}, [userId]);

  return (
    <div className="navbar">
      <div className="logo">
        <Link to="/home">GoGoGlobe</Link>
      </div>
      <div className="nav-links">
        <Link to="/summary-card">My Plan</Link>

        <Link to={`/notifications/${userId}`} className="notification-link">
          <div style={{ position: "relative", display: "inline-block" }}>
            <span role="img" aria-label="bell" style={{ fontSize: "20px" }}>🔔</span>
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "red",
                color: "white",
                borderRadius: "50%",
                padding: "2px 6px",
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <span style={{ marginLeft: "6px" }}>Notification</span>
        </Link>

        <Link to="/login">Sign Out</Link>
      </div>
    </div>
  );
}

export default Navbar;
