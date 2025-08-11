// src/pages/PackingList.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import "./PackingList.css";

export default function PackingList() {
  const { id } = useParams(); // 用户 ID
  const [packingData, setPackingData] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [newItems, setNewItems] = useState({});
  const [members, setMembers] = useState([]);

  // 统一 API 根；去除末尾多余的 /
  const API_BASE = process.env.REACT_APP_API_BASE || "/api";

  /* ========== 获取行程数据（包含 items） ========== */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/trip/user/${id}`, {
          credentials: "include",
        });
        let data = await res.json();

        if (!Array.isArray(data)) data = [data];

        const converted = data.map((trip) => {
          const start = new Date(trip.startDate);
          const end = new Date(trip.endDate);
          const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

          const items = (trip.items ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            packed: !!item.packed,
            // 和下拉值统一
            assignedTo: item.assignedTo ?? "unassigned",
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

        setPackingData(converted);
        if (converted.length > 0) setSelectedTripId(converted[0].id);
      } catch (e) {
        console.error("❌ Failed to fetch trip:", e);
      }
    })();
  }, [id]);

  /* ========== 获取成员数据（用于分配） ========== */
  useEffect(() => {
    if (!selectedTripId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/members?tripId=${selectedTripId}`, {
          credentials: "include",
        });
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("❌ Failed to fetch members:", e);
      }
    })();
  }, [selectedTripId]);

  /* ========== 可选：把数据缓存到 localStorage ========== */
  useEffect(() => {
    if (packingData.length > 0) {
      localStorage.setItem("packingData", JSON.stringify(packingData));
    }
  }, [packingData]);

  const selectedTrip = packingData.find((t) => t.id === selectedTripId);

  /* ========== 工具：按 tripId / itemId 更新本地状态 ========== */
  const updateItemLocal = (tripId, itemId, patch) => {
    setPackingData((prev) =>
      prev.map((t) =>
        t.id !== tripId
          ? t
          : {
              ...t,
              items: t.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
            }
      )
    );
  };

  const addItemLocal = (tripId, item) => {
    setPackingData((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, items: [...t.items, item] } : t))
    );
  };

  const removeItemLocal = (tripId, itemId) => {
    setPackingData((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, items: t.items.filter((it) => it.id !== itemId) } : t
      )
    );
  };

  /* ========== 勾选 packed（乐观） ========== */
  const togglePacked = async (tripId, itemId) => {
    const trip = packingData.find((t) => t.id === tripId);
    const item = trip?.items.find((i) => i.id === itemId);
    if (!item) return;

    const nextPacked = !item.packed;
    updateItemLocal(tripId, itemId, { packed: nextPacked });

    try {
      await fetch(`${API_BASE}/trip/item/${itemId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packed: nextPacked, assignedTo: item.assignedTo }),
      });
    } catch (e) {
      // 回滚
      updateItemLocal(tripId, itemId, { packed: item.packed });
      console.error("❌ Failed to toggle packed:", e);
    }
  };

  /* ========== 修改归属（乐观） ========== */
  const updateAssignedTo = async (tripId, itemId, name) => {
    const trip = packingData.find((t) => t.id === tripId);
    const item = trip?.items.find((i) => i.id === itemId);
    if (!item) return;

    const nextAssigned = name || "unassigned";
    updateItemLocal(tripId, itemId, { assignedTo: nextAssigned });

    try {
      await fetch(`${API_BASE}/trip/item/${itemId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packed: item.packed, assignedTo: nextAssigned }),
      });
    } catch (e) {
      // 回滚
      updateItemLocal(tripId, itemId, { assignedTo: item.assignedTo });
      console.error("❌ Failed to update assignedTo:", e);
    }
  };

  /* ========== 新增 item（乐观） ========== */
  const handleAddItem = async (tripId) => {
    const content = (newItems[tripId] || "").trim();
    if (!content) return;

    // 清空输入框
    setNewItems((s) => ({ ...s, [tripId]: "" }));

    // 临时条目（先展示）
    const temp = {
      id: `tmp-${Date.now()}`,
      name: content,
      packed: false,
      assignedTo: "unassigned",
      _tmp: true,
    };
    addItemLocal(tripId, temp);

    try {
      const res = await fetch(`${API_BASE}/trip/${tripId}/add-item`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: content, packed: false, assignedTo: "unassigned" }),
      });
      const data = await res.json();

      if (!data?.item?.id) throw new Error("invalid response");

      // 用服务端返回替换临时条目
      removeItemLocal(tripId, temp.id);
      addItemLocal(tripId, data.item);
    } catch (e) {
      // 失败则移除临时条目
      removeItemLocal(tripId, temp.id);
      console.error("❌ Failed to add item:", e);
      alert("Failed to add item, please try again later");
    }
  };

  /* ========== 清空全部 ========== */
  const clearAll = async () => {
    if (!selectedTrip) return;
    if (!window.confirm("Are you sure you want to clear all items?")) return;

    const prev = selectedTrip.items;
    // 乐观清空
    setPackingData((s) =>
      s.map((t) => (t.id === selectedTrip.id ? { ...t, items: [] } : t))
    );

    try {
      const res = await fetch(`${API_BASE}/trip/${selectedTrip.id}/clear-items`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("clear failed");
      alert("All items cleared successfully!");
    } catch (e) {
      // 回滚
      setPackingData((s) =>
        s.map((t) => (t.id === selectedTrip.id ? { ...t, items: prev } : t))
      );
      console.error("❌ Failed to clear items:", e);
      alert("Failed to clear");
    }
  };

  return (
    <>
      <Navbar />
      <SubNavBar />

      <div className="packing-page">
        <div className="trip-select">
          <label htmlFor="tripSelect" style={{ fontWeight: "bold" }}>
            Choose Trip：
          </label>
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
                onClick={clearAll}
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
              {selectedTrip.items.map((item) => (
                <li key={item.id} className="packing-item">
                  <input
                    type="checkbox"
                    checked={item.packed}
                    onChange={() => togglePacked(selectedTrip.id, item.id)}
                  />
                  <span style={{ textDecoration: item.packed ? "line-through" : "none" }}>
                    {item.name}
                  </span>

                  <span className="assigned-label">@{item.assignedTo}</span>

                  <select
                    className="assigned-select"
                    value={item.assignedTo}
                    onChange={(e) =>
                      updateAssignedTo(selectedTrip.id, item.id, e.target.value)
                    }
                  >
                    <option value="unassigned">unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.user.email}>
                        {m.user.email}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>

            <div className="add-item-section">
              <input
                type="text"
                placeholder="Add New Item..."
                value={newItems[selectedTrip.id] || ""}
                onChange={(e) =>
                  setNewItems((s) => ({ ...s, [selectedTrip.id]: e.target.value }))
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
