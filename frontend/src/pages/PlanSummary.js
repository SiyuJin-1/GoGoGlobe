import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./PlanSummary.css";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";

export default function PlanSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/trip/${id}`, {
          credentials: "include",
        });
        const data = await res.json();
        setPlan(data);
      } catch (err) {
        console.error("❌ fetch plan failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="ps-loader">Loading…</div>;
  }
  if (!plan || !Array.isArray(plan?.schedule)) {
    return <div className="ps-empty">No schedule found for this plan.</div>;
  }

  return (
    <>
        <Navbar />
        <SubNavBar/>
    <div className="ps-wrapper">
      <h2 className="ps-title">Your Travel Summary</h2>

      {plan.schedule.map((day, i) => (
        <section className="ps-day-card" key={i}>
          <header className="ps-day-header">
            <span className="ps-day-dot" />
            <h3 className="ps-day-date">
              {day?.date
                ? new Date(day.date).toLocaleDateString()
                : `Day ${i + 1}`}
            </h3>
          </header>

          <div className="ps-timeline">
            {(day.items || []).map((item, j) => (
              <article className="ps-item" key={j}>
                <div className="ps-time">
                  <span className="ps-time-icon">🕐</span>
                  {item.time || "—"}
                </div>

                <div className="ps-node">
                  <span className="ps-pin">📍</span>
                </div>

                <div className="ps-content">
                  <div className="ps-place">
                    {item.locationName || item.title || "Untitled"}
                  </div>

                  {item.description && (
                    <div className="ps-desc">{item.description}</div>
                  )}

                  {item.duration && (
                    <div className="ps-meta">
                      <span className="ps-meta-icon">⏱</span>
                      {item.duration}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="ps-actions">
        <button className="ps-btn" onClick={() => navigate("/summary-card")}>
          ← Back to My Plans
        </button>
      </div>
    </div>
    </>
  );
}
