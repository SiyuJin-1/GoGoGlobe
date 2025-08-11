// src/pages/MyItinerary.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./MyItinerary.css";
import Navbar from "./Navbar";
import MapView from "./MapView";

const API_BASE = process.env.REACT_APP_API_BASE || "/api";


export default function MyItinerary() {
  const [schedule, setSchedule] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [mapTarget, setMapTarget] = useState({ dayIndex: null, itemIndex: null });
  const [editingId, setEditingId] = useState(null);
  const [manualMode, setManualMode] = useState(false); // 仅用于“新建手动计划”的初始填充
  const [userId, setUserId] = useState(null);
  const mapRef = useRef(null);
  const navigate = useNavigate();

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // 只根据 plan 自身判断是否手动（不读 localStorage.planMode）
  const detectManualFromPlan = (plan) =>
    plan?.isManual === true || plan?.source === "manual";

  const getPlanData = () => {
    const editing = localStorage.getItem("editingPlan");
    if (editing) {
      const parsed = JSON.parse(editing);
      localStorage.setItem("planData", JSON.stringify(parsed));
      return parsed;
    }
    const plan = localStorage.getItem("planData") || localStorage.getItem("myPlan");
    return plan ? JSON.parse(plan) : {};
  };

  const ensureUserId = async () => {
    const qs = new URLSearchParams(window.location.search);
    const fromUrl = toNum(qs.get("userId"));
    if (fromUrl) {
      localStorage.setItem("userId", String(fromUrl));
      setUserId(fromUrl);
      window.history.replaceState({}, "", window.location.pathname);
      return fromUrl;
    }
    const cached = toNum(localStorage.getItem("userId"));
    if (cached) {
      setUserId(cached);
      return cached;
    }
    try {
      const r = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        const id = toNum(d?.user?.id);
        if (id) {
          localStorage.setItem("userId", String(id));
          setUserId(id);
          return id;
        }
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    (async () => {
      await ensureUserId();

      const plan = getPlanData();
      setEditingId(plan?.id ?? null);

      // 编辑已有计划时，不启用手动模式（避免隐藏按钮/裁剪列表）
      const manual = !plan?.id && detectManualFromPlan(plan);
      setManualMode(manual);

      // 已经是扁平结构：[{date, items:[...] }]
      if (Array.isArray(plan?.schedule) && plan.schedule.length > 0) {
        const firstDay = plan.schedule[0];

        // 如果是“生成页”的结构：每个 day 里有 items，每个 item 里有 activities
        const looksLikeGenerated =
          Array.isArray(firstDay?.items) &&
          firstDay.items.length > 0 &&
          Array.isArray(firstDay.items[0]?.activities);

        if (looksLikeGenerated) {
          const flattened = plan.schedule.map((day) => ({
            date: day.date,
            items: (day.items || []).flatMap((block) => {
              const startTime = block.timeRange?.split("–")[0] || "";
              return (block.activities || []).map((a) => ({
                time: startTime,
                title: a.title,
                description: a.description || a.highlights || a.tips || "",
                duration: a.duration || "",
                locationName: a.locationName || a.title || "",
              }));
            }),
          }));
          setSchedule(flattened);
        } else {
          setSchedule(plan.schedule);
        }
        return;
      }

      // 新建且明确是手动模式：给一个空白卡起步
      if (manual) {
        setSchedule([
          {
            date: plan.startDate || "Day 1",
            items: [{ time: "8:00", title: "", description: "", duration: "", locationName: "" }],
          },
        ]);
      } else {
        setSchedule([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocationSelected = (locationName) => {
    const updated = [...schedule];
    const { dayIndex, itemIndex } = mapTarget;
    updated[dayIndex].items[itemIndex].locationName = locationName;
    setSchedule(updated);
    setShowMap(false);
  };

  const handleAddItem = (dayIndex, insertAfterIndex) => {
    const updated = [...schedule];
    updated[dayIndex].items.splice(insertAfterIndex + 1, 0, {
      time: "12:00",
      title: "",
      description: "",
      duration: "",
      locationName: "",
    });
    setSchedule(updated);
  };

  const handleDeleteItem = (dayIndex, itemIndex) => {
    const updated = [...schedule];
    updated[dayIndex].items.splice(itemIndex, 1);
    setSchedule(updated);
  };

  const handleChange = (dayIndex, itemIndex, field, value) => {
    const updated = [...schedule];
    updated[dayIndex].items[itemIndex][field] = value;
    setSchedule(updated);
  };

  const handleSave = async () => {
    try {
      const planData = getPlanData();
      const uid = userId || toNum(localStorage.getItem("userId"));
      if (!uid) {
        alert("Not logged in. Please sign in first.");
        return;
      }

      const fromCity = planData.fromCity || planData.origin || planData.startCity;
      const destination = planData.destination || planData.endCity || planData.city;
      const startDate = planData.startDate;
      const endDate = planData.endDate;

      if (!fromCity || !destination || !startDate || !endDate) {
        alert("Missing required fields: fromCity / destination / startDate / endDate");
        return;
      }

      const payload = {
        userId: uid,
        fromCity,
        destination,
        startDate,
        endDate,
        schedule: Array.isArray(schedule) ? schedule : [],
      };

      const url = editingId ? `${API_BASE}/trip/${editingId}` : `${API_BASE}/trip`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));

      localStorage.removeItem("editingPlan");
      alert("✅ Plan saved successfully!");
      navigate("/summary-card");
    } catch (err) {
      console.error("❌ Save failed:", err);
      alert("❌ Failed to save plan: " + (err?.message || "Unknown error"));
    }
  };

  return (
    <>
      <Navbar />
      <div className="my-itinerary-wrapper">
        {schedule.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <p style={{ fontSize: "1.2rem" }}>No itinerary found.</p>
          </div>
        ) : (
          schedule.map((day, i) => (
            <div key={i} className="day-block">
              <h3 className="day-title">{day.date}</h3>
              <div className="item-list">
                {day.items.map((item, j) => (
                  <div className="schedule-item-card" key={j} style={{ position: "relative" }}>
                    <input
                      className="item-time-input"
                      value={item.time}
                      onChange={(e) => handleChange(i, j, "time", e.target.value)}
                    />
                    <div className="item-details">
                      <div className="item-location-row">
                        <div className="location-name">📍 Location: {item.locationName || item.title}</div>
                        <button
                          className="edit-location-btn"
                          onClick={() => {
                            setMapTarget({ dayIndex: i, itemIndex: j });
                            setShowMap(true);
                            setTimeout(() => mapRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
                          }}
                        >
                          Change Location
                        </button>
                      </div>

                      <div className="editable-field">
                        <textarea
                          className="item-desc"
                          value={item.description}
                          onChange={(e) => handleChange(i, j, "description", e.target.value)}
                        />
                        <span className="edit-icon">✏️</span>
                      </div>

                      {item.duration && <div className="item-duration">⏱ {item.duration}</div>}

                      <div className="item-footer-buttons">
                        <button className="add-item-btn" onClick={() => handleAddItem(i, j)}>
                          Add New Item
                        </button>
                        <button className="delete-item-btn" onClick={() => handleDeleteItem(i, j)}>
                          Delete This Item
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button className="apply-btn" onClick={handleSave}>
            Save Plan
          </button>
        </div>

        {showMap && (
          <div className="map-popup">
            <div className="map-modal" ref={mapRef}>
              <MapView onLocationSelected={handleLocationSelected} />
              <button onClick={() => setShowMap(false)} className="close-map-btn">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
