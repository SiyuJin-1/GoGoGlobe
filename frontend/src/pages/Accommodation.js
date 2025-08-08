import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import AccommodationForm from "./AccommodationForm";
import "./Accommodation.css";

// 允许用环境变量覆盖后端地址：VITE_API_BASE=http://localhost:3001
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:3001";

export default function AddAccommodationPage() {
  const { id } = useParams(); // 当前用户 ID
  const [tripList, setTripList] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [accommodations, setAccommodations] = useState([]);

  // 编辑 / 删除 / 保存
  const [editing, setEditing] = useState(null); // {id, tripId, name, address, checkIn, checkOut, bookingUrl, imageUrl, imageKey, _newFile?}
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // ---------- 工具：UTC 显示 ----------
  const fmtUTC = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });

  const toYMD = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toISOString().slice(0, 10);
    } catch {
      return String(iso).slice(0, 10);
    }
  };

  // ---------- 获取数据 ----------
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/trip/user/${id}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTripList(data);
          setSelectedTripId(data[0].id);
        } else {
          setTripList([]);
          setSelectedTripId(null);
        }
      } catch (err) {
        console.error("❌ 获取行程失败:", err);
      }
    };
    fetchTrips();
  }, [id]);

  const loadAccommodations = async (tripId) => {
    try {
      const res = await fetch(`${API_BASE}/api/accommodations?tripId=${tripId}`);
      const data = await res.json();
      setAccommodations((data || []).sort((a, b) => Date.parse(a.checkIn) - Date.parse(b.checkIn)));
    } catch (err) {
      console.error("❌ 获取住宿失败:", err);
    }
  };

  useEffect(() => {
    if (selectedTripId) loadAccommodations(selectedTripId);
  }, [selectedTripId]);

  // ---------- S3 直传（编辑换图时用） ----------
  async function uploadToS3(file, { userId, tripId }) {
    // 取预签名：加 kind=accommodation -> 公开桶
    const r1 = await fetch(`${API_BASE}/api/upload/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: file.type,
        userId,
        tripId,
        size: file.size,
        kind: "accommodation",
      }),
    });
    if (!r1.ok) throw new Error("获取签名失败：" + (await r1.text().catch(() => "")));
    const { uploadUrl, publicUrl, key } = await r1.json();

    // PUT 到 S3（Content-Type 必须与签名一致）
    const r2 = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!r2.ok) throw new Error("上传到 S3 失败：" + (await r2.text().catch(() => "")));

    return { publicUrl, key };
  }

  // ---------- 删除 ----------
  const handleDelete = async (accId, tripId) => {
    if (!window.confirm("确定删除这条住宿吗？")) return;
    try {
      setDeletingId(accId);
      const r = await fetch(`${API_BASE}/api/accommodations/${accId}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => "");
        throw new Error(msg || "删除失败");
      }
      await loadAccommodations(tripId);
    } catch (e) {
      alert(e.message || "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  // ---------- 编辑 ----------
  const startEdit = (acc) => {
    setEditing({
      ...acc,
      checkIn: toYMD(acc.checkIn),
      checkOut: toYMD(acc.checkOut),
      _newFile: null,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSaving(true);

      let imageUrl = editing.imageUrl || null;
      let imageKey = editing.imageKey || null;

      // 选择了新图 -> 先直传
      if (editing._newFile) {
        const { publicUrl, key } = await uploadToS3(editing._newFile, {
          userId: id,
          tripId: editing.tripId || selectedTripId,
        });
        imageUrl = publicUrl;
        imageKey = key;
      }

      const r = await fetch(`${API_BASE}/api/accommodations/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          address: editing.address,
          checkIn: editing.checkIn,   // YYYY-MM-DD，后端 new Date() 存 UTC
          checkOut: editing.checkOut,
          bookingUrl: editing.bookingUrl,
          imageUrl,
          imageKey,
        }),
      });
      if (!r.ok) throw new Error(await r.text());

      setEditing(null);
      await loadAccommodations(selectedTripId);
    } catch (e) {
      alert("更新失败：" + (e.message || "未知错误"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <SubNavBar />

      <div className="accommodation-page">
        {/* 行程选择 */}
        <div className="trip-selector-global">
          <label>Choose Trip：</label>
          <select
            value={selectedTripId ?? ""}
            onChange={(e) => setSelectedTripId(Number(e.target.value))}
          >
            {tripList.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.fromCity} ➝ {trip.destination}
              </option>
            ))}
          </select>
        </div>

        <div className="accommodation-columns">
          {/* 左侧时间轴 */}
          <div className="timeline-column">
            <h3>Accommodations</h3>
            {accommodations.length === 0 ? (
              <p>No accommodation yet</p>
            ) : (
              accommodations.map((acc) => {
                const isEditing = editing?.id === acc.id;
                return (
                  <div className="accommodation-card" key={acc.id}>
                    <div className="date-label">
                      {fmtUTC(acc.checkIn)} → {fmtUTC(acc.checkOut)}
                    </div>

                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <img
                        src={
                          acc.imageUrl?.startsWith("http")
                            ? acc.imageUrl
                            : `${API_BASE}${acc.imageUrl || ""}` // 兼容老数据
                        }
                        alt="accommodation"
                        className="thumbnail"
                      />

                      {/* 信息区：展示 或 编辑表单 */}
                      {!isEditing ? (
                        <div className="card-info" style={{ flex: 1 }}>
                          <h4>{acc.name || "未命名住宿"}</h4>
                          <p>{acc.address || "暂无地址"}</p>
                          {acc.bookingUrl && (
                            <a href={acc.bookingUrl} target="_blank" rel="noreferrer">
                              🔗 Link
                            </a>
                          )}
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: "grid", gap: 6 }}>
                          <input
                            value={editing.name || ""}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            placeholder="🏨 Name"
                          />
                          <input
                            value={editing.address || ""}
                            onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                            placeholder="📍 Address"
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              type="date"
                              value={editing.checkIn || ""}
                              onChange={(e) => setEditing({ ...editing, checkIn: e.target.value })}
                            />
                            <input
                              type="date"
                              value={editing.checkOut || ""}
                              onChange={(e) => setEditing({ ...editing, checkOut: e.target.value })}
                            />
                          </div>
                          <input
                            value={editing.bookingUrl || ""}
                            onChange={(e) => setEditing({ ...editing, bookingUrl: e.target.value })}
                            placeholder="🔗 Link"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setEditing({ ...editing, _newFile: e.target.files?.[0] || null })
                            }
                          />
                        </div>
                      )}

                      {/* 右侧操作区 */}
                      <div style={{ display: "flex", gap: 8 }}>
                        {!isEditing ? (
                          <>
                            <button onClick={() => startEdit(acc)}>Edit</button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDelete(acc.id, acc.tripId)}
                              disabled={deletingId === acc.id}
                            >
                              {deletingId === acc.id ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={saveEdit} disabled={saving}>
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button onClick={() => setEditing(null)}>Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 右侧新增表单 */}
          <div className="form-column">
            <AccommodationForm
              userId={id}
              tripList={tripList}
              selectedTripId={selectedTripId}
              setSelectedTripId={setSelectedTripId}
              onSuccess={() => loadAccommodations(selectedTripId)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
