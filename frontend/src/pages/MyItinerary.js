import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./MyItinerary.css";
import Navbar from "./Navbar";
import MapView from './MapView';

function MyItinerary() {
  const [schedule, setSchedule] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [mapTarget, setMapTarget] = useState({ dayIndex: null, itemIndex: null });
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);

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
    duration: ""
  });
  setSchedule(updated);
};


  const handleDeleteItem = (dayIndex, itemIndex) => {
  const updated = [...schedule];
  updated[dayIndex].items.splice(itemIndex, 1);
  setSchedule(updated);
};

  useEffect(() => {
  const editing = localStorage.getItem("editingPlan");
  const stored = localStorage.getItem("myPlan");
  if (editing) {
    const parsed = JSON.parse(editing);
    setEditingId(parsed.id);                      // ✅ 保存 plan.id
    setSchedule(parsed.schedule);
    localStorage.setItem("planData", JSON.stringify(parsed)); // 以确保保存用到 plan 信息
  } else if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed?.schedule?.length > 0) {
      const flattened = parsed.schedule.map((day) => ({
        date: day.date,
        items: day.items.flatMap((block) => {
          const startTime = block.timeRange?.split("–")[0] || "";
          return block.activities.map((a) => ({
            time: startTime,
            title: a.title,
            description: a.description || a.highlights || a.tips || "",
            duration: a.duration || "",
          }));
        }),
      }));
      setSchedule(flattened);
    }
  }
}, []);


  const handleChange = (dayIndex, itemIndex, field, value) => {
    const updated = [...schedule];
    updated[dayIndex].items[itemIndex][field] = value;
    setSchedule(updated);
  };

const handleSave = async () => {
  const planData = JSON.parse(localStorage.getItem("planData"));
  const userId = localStorage.getItem("userId");

  const payload = {
    userId,
    fromCity: planData.fromCity,
    destination: planData.destination,
    startDate: planData.startDate,
    endDate: planData.endDate,
    schedule,
  };

  const url = editingId
    ? `http://localhost:3001/api/trip/${editingId}` // ✅ 修改为 PUT 路径
    : "http://localhost:3001/api/trip";

  const method = editingId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to save trip");
    }

    localStorage.removeItem("editingPlan"); // ✅ 清除编辑状态
    alert("✅ Plan saved successfully to database!");
    navigate("/summary-card");
  } catch (error) {
    console.error("❌ Save failed:", error);
    alert("❌ Failed to save plan");
  }
};





  return (
    <>
    <Navbar />
    
    <div className="my-itinerary-wrapper">
      {schedule.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <p style={{ fontSize: "1.2rem" }}>🚫 No itinerary found.</p>
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
  <div className="location-name">
    📍 Location：{item.locationName || item.title}
  </div>
  <button
    className="edit-location-btn"
    onClick={() => {
      setMapTarget({ dayIndex: i, itemIndex: j });
      setShowMap(true);
      setTimeout(() => {
      mapRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    }}
  >
    Change Location
  </button>
</div>



    <div className="editable-field">
      <textarea
        className="item-desc"
        value={item.description}
        onChange={(e) => handleChange(i, j, "description", e.target.value)} // 这里 key 改为 "description"
      />
      <span className="edit-icon">✏️</span>
    </div>

    {item.duration && (
      <div className="item-duration">⏱ {item.duration}</div>
    )}

    {/* 添加按钮：放在 item 列表最底部，只出现一次 */}
{/* {j === day.items.length - 1 && ( */}
  <div className="item-footer-buttons">
    <button
      className="add-item-btn"
      onClick={() => handleAddItem(i, j)}
    >
      ➕ Add New Item
    </button>
    <button
      className="delete-item-btn"
      onClick={() => handleDeleteItem(i, j)}
    >
      ❌ Delete This Item
    </button>
  </div>
{/* )} */}

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
    </div>
    
    {showMap && (
  <div className="map-popup">
    <div className="map-modal">
      <MapView onLocationSelected={handleLocationSelected} />
      <button onClick={() => setShowMap(false)} className="close-map-btn">
        Close
      </button>
    </div>
  </div>
)}


</>
  );
}

export default MyItinerary;
