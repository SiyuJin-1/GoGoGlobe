import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import "./PackingList.css";

export default function PackingList() {
  const { id } = useParams(); // 从 URL 拿用户 ID
  const [packingData, setPackingData] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [newItems, setNewItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  // 获取 packingData（根据用户 ID）
useEffect(() => {
  const fetchPackingData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/trip/user/${id}`);
      let data = await res.json();

      console.log("📦 获取 packing data:", data);

      // 🛡️ 确保 data 是数组
      if (!Array.isArray(data)) {
        console.warn("⚠️ 返回值不是数组:", data);
        data = [data];
      }

      const converted = data.map((trip) => {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        const days =
          Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // ✅ 只使用 trip.items
        const items = (trip.items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          packed: item.packed ?? false,
          assignedTo: item.assignedTo ?? "未分配",
        }));

        return {
          ...trip,
          title: `${trip.fromCity} ➝ ${trip.destination}`,
          date: `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()} ~ ${
            end.getMonth() + 1
          }/${end.getDate()}/${end.getFullYear()}`,
          days,
          items,
        };
      });

      console.log("✅ 转换后的 packingData:", converted);
      setPackingData(converted);

      if (converted.length > 0) {
        setSelectedTripId(converted[0].id);
      }

    } catch (err) {
      console.error("❌ 获取 trip 失败:", err);
    }
  };

  fetchPackingData();
}, [id]);



useEffect(() => {
  const fetchMembers = async () => {
    if (!selectedTripId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/members?tripId=${selectedTripId}`);
      const data = await res.json();
      console.log("👥 成员数据:", data);
      setMembers(data);
    } catch (err) {
      console.error("❌ 获取成员失败", err);
    }
  };

  fetchMembers();
}, [selectedTripId]);


  // 自动保存到 localStorage（可选）
  useEffect(() => {
    if (packingData.length > 0) {
      localStorage.setItem("packingData", JSON.stringify(packingData));
    }
  }, [packingData]);
console.log("📦 packingData:", packingData);

  // 修改 packed 状态
  // 修改 packed 状态，并同步后端
const togglePacked = async (tripId, index) => {
  const updated = packingData.map((trip) => {
    if (trip.id === tripId) {
      const items = [...trip.items];
      const item = items[index];
      item.packed = !item.packed;

      // 发请求更新后端
      fetch(`http://localhost:3001/api/trip/item/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packed: item.packed, assignedTo: item.assignedTo }),
      });

      return { ...trip, items };
    }
    return trip;
  });
  setPackingData(updated);
};

// 修改归属人，并同步后端
const updateAssignedTo = async (tripId, index, name) => {
  const updated = packingData.map((trip) => {
    if (trip.id === tripId) {
      const items = [...trip.items];
      const item = items[index];
      item.assignedTo = name;

      // 发请求更新后端
      fetch(`http://localhost:3001/api/trip/item/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packed: item.packed, assignedTo: item.assignedTo }),
      });

      return { ...trip, items };
    }
    return trip;
  });
  setPackingData(updated);
};


  // 添加新 item
const handleAddItem = async (tripId) => {
  const content = newItems[tripId];
  if (!content?.trim()) return;

  const newItem = { name: content, packed: false, assignedTo: "未分配" };
  setNewItems({ ...newItems, [tripId]: "" });

  try {
    const res = await fetch(`http://localhost:3001/api/trip/${tripId}/add-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });

    const data = await res.json();

    if (!data.item || !data.item.id) {
      console.error("❌ 后端未返回完整 item", data);
      return;
    }

    // ✅ 用后端返回的 item（含 id）更新 state
    const updated = packingData.map((trip) => {
      if (trip.id === tripId) {
        const items = [...trip.items, data.item];
        return { ...trip, items };
      }
      return trip;
    });
    setPackingData(updated);
  } catch (err) {
    console.error("❌ 添加物品失败:", err);
  }
};

   const selectedTrip = packingData.find((trip) => trip.id === selectedTripId);

//   if (loading) return <p style={{ padding: "2rem" }}>⏳ Loading packing list...</p>;

  return (
  <>
    <Navbar />
    <SubNavBar />
    <div className="packing-page">
      <div className="trip-select">
        <label htmlFor="tripSelect" style={{ fontWeight: 'bold' }}>Choose Trip：</label>
        <select
          id="tripSelect"
          value={selectedTripId ?? ""}
          onChange={(e) => setSelectedTripId(Number(e.target.value))}
        >
          <option value="">Choose Trip</option>
          {packingData.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.title}
            </option>
          ))}
        </select>
      </div>

      {selectedTrip && (
        <div className="packing-card">
          <div
            className="packing-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <h3>{selectedTrip.title}</h3>
              <span className="packing-date">
                {selectedTrip.date} ・{selectedTrip.days}天
              </span>
            </div>

            <button
              onClick={async () => {
                const confirm = window.confirm("Are you sure you want to clear all items?");
                if (!confirm) return;

                try {
                  await fetch(`http://localhost:3001/api/trip/${selectedTrip.id}/clear-items`, {
                    method: "DELETE",
                  });
                  alert("All items cleared successfully!");

                  setPackingData((prev) =>
                    prev.map((trip) =>
                      trip.id === selectedTrip.id ? { ...trip, items: [] } : trip
                    )
                  );
                } catch (err) {
                  console.error("Failed to clear", err);
                  alert("Failed to clear");
                }
              }}
              style={{
                background: "#f44336",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Clear All Items
            </button>
          </div>

          <ul className="packing-items">
            {selectedTrip.items.map((item, idx) => {
              console.log("assignedTo:", item.assignedTo);
              console.log("Optional Members:", members.map(m => m.username));
              console.log("Members Data：", members);

              return (
                <li key={idx} className="packing-item">
                  <input
                    type="checkbox"
                    checked={item.packed}
                    onChange={() => togglePacked(selectedTrip.id, idx)}
                  />
                  <span style={{ textDecoration: item.packed ? "line-through" : "none" }}>
                    {item.name}
                  </span>
                  <span className="assigned-label">@{item.assignedTo}</span>
                  <select
                    className="assigned-select"
                    value={item.assignedTo}
                    onChange={(e) =>
                      updateAssignedTo(selectedTrip.id, idx, e.target.value)
                    }
                  >
                    <option value="unassigned">unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.user.email}>
                        {member.user.email}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>

          <div className="add-item-section">
            <input
              type="text"
              placeholder="Add New Item..."
              value={newItems[selectedTrip.id] || ""}
              onChange={(e) =>
                setNewItems({ ...newItems, [selectedTrip.id]: e.target.value })
              }
            />
            <button onClick={() => handleAddItem(selectedTrip.id)}>Add</button>
          </div>
        </div>
      )}
    </div>
  </>
);

}
