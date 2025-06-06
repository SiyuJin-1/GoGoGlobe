import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SummaryCard.css";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";

// 单个行程卡片组件
const SummaryCard = ({ plan, onClick, onDelete, onEdit }) => {
  const { id, fromCity, destination, startDate, endDate, schedule, cover } = plan;
  const totalItems = schedule.reduce((sum, day) => sum + (day.items?.length || 0), 0);
  const totalDays = schedule.length;

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
      onEdit(plan); // 👈 传递 plan 对象
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
  >
    🗑️
  </button>
</div>

    </div>
  );
};

// 主组件
export default function TravelSummaries() {
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();
const handleEdit = (plan) => {
  localStorage.setItem("editingPlan", JSON.stringify(plan)); // 👈 让编辑页知道是编辑哪个计划
  navigate("/itinerary");
};



  // 删除行程
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("确认要删除这个行程吗？");
    if (!confirmDelete) return;

    try {
      await fetch(`http://localhost:3001/api/trip/${id}`, {
        method: "DELETE",
      });

      setPlans((prev) => prev.filter((plan) => plan.id !== id)); // 更新前端展示
    } catch (err) {
      console.error("❌ 删除失败:", err);
      alert("删除失败，请稍后重试");
    }
  };

  // 加载行程数据
  useEffect(() => {
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

    fetchPlans();
  }, []);

  return (
    <>
      <Navbar />
      <SubNavBar />
      <div className="summary-wrapper">
        <h2 className="summary-title">🌐 My Travel Summaries</h2>
        {plans.length === 0 ? (
          <p style={{ padding: "1rem" }}>No saved plans found.</p>
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
