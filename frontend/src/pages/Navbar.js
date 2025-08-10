import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

function Navbar() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(() => localStorage.getItem("userId"));
  const [unreadCount, setUnreadCount] = useState(0);

  // 小工具：避免把 HTML 当 JSON 解析
  const getJSON = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...options,
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const body = await res.text();
      throw new Error(`Expected JSON, got ${ct}: ${body.slice(0, 120)}…`);
    }
    if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
    return res.json();
  };

  // 确保拿到 userId：localStorage -> /api/auth/me
  const ensureUserId = async () => {
    let id = localStorage.getItem("userId");
    if (id) {
      setUserId(id);
      return id;
    }
    try {
      const d = await getJSON("/api/auth/me");
      if (d?.user?.id) {
        id = String(d.user.id);
        localStorage.setItem("userId", id);
        setUserId(id);
        return id;
      }
    } catch {}
    return null;
  };

  // 拉未读通知数
  useEffect(() => {
    let stopped = false;

    const fetchUnread = async () => {
      const id = userId || (await ensureUserId());
      if (!id || id === "null") {
        if (!stopped) setUnreadCount(0);
        return;
      }
      try {
        const data = await getJSON(`/api/notification/user/${id}/unread-count`);
        if (!stopped) setUnreadCount(Number(data?.count || 0));
      } catch (err) {
        console.warn("获取未读通知数量失败:", err.message);
        if (!stopped) setUnreadCount(0);
      }
    };

    fetchUnread();
    return () => { stopped = true; };
  }, [userId]); // 拿到 userId 再拉一次

  // 退出登录
  const handleSignOut = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    localStorage.removeItem("userId");
    setUserId(null);
    setUnreadCount(0);
    navigate("/login");
  };

  return (
    <div className="navbar">
      <div className="logo">
        <Link to="/home">GoGoGlobe</Link>
      </div>

      <div className="nav-links">
        <Link to="/summary-card">My Plan</Link>

        <Link
          to={userId ? `/notifications/${userId}` : "/login"}
          className="notification-link"
          onClick={(e) => {
            if (!userId) {
              e.preventDefault();
              navigate("/login");
            }
          }}
        >
          <div style={{ position: "relative", display: "inline-block" }}>
            <span role="img" aria-label="bell" style={{ fontSize: "20px" }}>🔔</span>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  background: "red",
                  color: "white",
                  borderRadius: "50%",
                  padding: "2px 6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <span style={{ marginLeft: "6px" }}>Notification</span>
        </Link>

        <a href="/login" onClick={handleSignOut}>Sign Out</a>
      </div>
    </div>
  );
}

export default Navbar;
