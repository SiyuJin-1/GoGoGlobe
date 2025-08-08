import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./SummaryCard.css";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";

// 🧳 单个行程卡片组件
const SummaryCard = ({ plan, onClick, onDelete, onEdit }) => {
  const { fromCity, destination, startDate, endDate, schedule = [], cover } = plan;
  const totalDays = schedule.length;
  const totalItems = schedule.reduce((sum, day) => sum + (day.items?.length || 0), 0);

  return (
    <div className="summary-card" onClick={onClick}>
      <div className="summary-left">
        <div className="summary-route">{fromCity} → {destination}</div>
        <div className="summary-dates">
          {new Date(startDate).toLocaleDateString()} ~ {new Date(endDate).toLocaleDateString()}
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
          onClick={(e) => {
            e.stopPropagation();
            onEdit(plan);
          }}
        >
          Edit
        </button>
        <button
  className="delete-btn"
  onClick={(e) => {
    e.stopPropagation();
    onDelete(plan.id);
  }}
  style={{
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
  title="删除计划"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="grey"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
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

// 🧭 总览页面
export default function TravelSummaries() {
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // 🧠 编辑行程：跳转并存储 plan 数据
  const handleEdit = (plan) => {
    localStorage.setItem("editingPlan", JSON.stringify(plan));
    navigate("/itinerary");
  };

  // 🧹 删除行程
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("确认要删除这个行程吗？");
    if (!confirmDelete) return;

    try {
      await fetch(`http://localhost:3001/api/trip/${id}`, { method: "DELETE" });
      await fetchPlans(); // 删除后刷新
    } catch (err) {
      console.error("❌ 删除失败:", err);
      alert("删除失败，请稍后重试");
    }
  };

  // 🌐 获取所有计划
  const fetchPlans = async () => {
    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch(`http://localhost:3001/api/trip/user/${userId}`);
      const data = await response.json();
      console.log("📦 从数据库读取的用户计划：", data);
      setPlans(data);
    } catch (err) {
      console.error("❌ 获取行程失败:", err);
    }
  };

  // 🎯 初始化时加载计划；也监听 URL 变化（如 ?reload=1）
  useEffect(() => {
    fetchPlans();
  }, [location.search]);

  return (
    <>
      <Navbar />
      <SubNavBar />
      <div className="summary-wrapper">
        <h2 className="summary-title">🌐 My Travel Summaries</h2>
        {plans.length === 0 ? (
          <p style={{ padding: "1rem" }}>目前没有保存的行程。</p>
        ) : (
          plans.map((plan) => (
            <SummaryCard
              key={plan.id}
              plan={plan}
              onClick={() => navigate(`/plan-summary/${plan.id}`)}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>
    </>
  );
}
