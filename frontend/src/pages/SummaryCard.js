// src/pages/SummaryCard.js (or SummaryCard.jsx)
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SummaryCard.css";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

/* 单张卡片 */
const SummaryCard = ({ plan, onClick, onDelete, onEdit }) => {
  const { fromCity, destination, startDate, endDate, schedule = [], cover } = plan || {};
  const totalDays = Array.isArray(schedule) ? schedule.length : 0;
  const totalItems = Array.isArray(schedule)
    ? schedule.reduce((sum, day) => sum + (day?.items?.length || 0), 0)
    : 0;

  return (
    <div className="summary-card" onClick={onClick}>
      <div className="summary-left">
        <div className="summary-route">{fromCity} → {destination}</div>
        <div className="summary-dates">
          {startDate ? new Date(startDate).toLocaleDateString() : "-"}{" ~ "}
          {endDate ? new Date(endDate).toLocaleDateString() : "-"}
        </div>
        <div className="summary-count">{totalDays} 天 ｜ 共 {totalItems} 个地点</div>
      </div>
      <div className="summary-right">
        <img
          src={cover || "/images/default-cover.jpg"}
          alt="cover"
          className="summary-cover"
        />
      </div>
      <div className="summary-actions">
        <button
          className="edit-btn"
          onClick={(e) => { e.stopPropagation(); onEdit(plan); }}
        >
          Edit
        </button>
        <button
          className="delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          title="删除计划"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="grey" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function TravelSummaries() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const ensureUserId = async () => {
    // 1) localStorage
    const cached = localStorage.getItem("userId");
    if (cached) return cached;

    // 2) /api/auth/me
    try {
      const r = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        if (d?.user?.id) {
          localStorage.setItem("userId", String(d.user.id));
          return String(d.user.id);
        }
      }
    } catch {}
    return null;
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      let userId = localStorage.getItem("userId") || await ensureUserId();
      if (!userId) {
        setPlans([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/trip/user/${userId}`, { credentials: "include" });

      // 先检查是不是 JSON（防止前端服务器返回 HTML）
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        console.warn("Expected JSON, got:", ct, "body:", await res.text());
        setPlans([]);
        return;
      }
      if (!res.ok) {
        console.warn("fetch plans failed:", await res.text());
        setPlans([]);
        return;
      }

      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("❌ 获取行程失败:", e);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan) => {
    localStorage.setItem("editingPlan", JSON.stringify(plan));
    navigate("/itinerary");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("确认要删除这个行程吗？")) return;
    try {
      await fetch(`${API_BASE}/api/trip/${id}`, { method: "DELETE", credentials: "include" });
      await fetchPlans();
    } catch (e) {
      console.error("❌ 删除失败:", e);
      alert("删除失败，请稍后再试");
    }
  };

  useEffect(() => { fetchPlans(); }, [location.search]);

  return (
    <>
      <Navbar />
      <SubNavBar />
      <div className="summary-wrapper">
        <h2 className="summary-title">🌐 My Travel Summaries</h2>
        {loading ? (
          <p style={{ padding: "1rem" }}>加载中...</p>
        ) : !plans.length ? (
          <p style={{ padding: "1rem" }}>目前没有保存的行程。</p>
        ) : (
          plans.map((p) => (
            <SummaryCard
              key={p.id}
              plan={p}
              onClick={() => navigate(`/plan-summary/${p.id}`)}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>
    </>
  );
}
