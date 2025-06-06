import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./PlanSummary.css";

function PlanSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/trip/${id}`);
        const data = await res.json();
        setPlan(data);
      } catch (err) {
        console.error("❌ 获取 plan 失败:", err);
      }
    };
    fetchPlan();
  }, [id]);

  if (!plan) return <p style={{ padding: "2rem" }}>⏳ Loading...</p>;

  return (
    <div className="plan-summary-wrapper">
      <h2>📅 Your Travel Summary</h2>
      {plan.schedule.map((day, i) => (
        <div className="day-summary-card" key={i}>
          <h3>{day.date}</h3>
          {day.items.map((item, j) => (
            <div className="summary-item" key={j}>
              <div className="summary-time">🕐 {item.time}</div>
              <div className="summary-title">📍 {item.locationName || item.title}</div>
              {item.description && <div className="summary-desc">{item.description}</div>}
              {item.duration && <div className="summary-duration">⏱ {item.duration}</div>}
            </div>
          ))}
        </div>
      ))}
      <button onClick={() => navigate("/summary-card")}>← Back to My Plans</button>
    </div>
  );
}

export default PlanSummary;
