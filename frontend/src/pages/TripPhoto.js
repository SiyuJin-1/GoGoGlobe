import React, { useEffect, useMemo, useState, useRef } from "react";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import "./TripPhoto.css";
import UploadPhotoForm from "./UploadPhotoForm";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:3001";

export default function TripPhotoPage() {
  // ---------- state ----------
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("public");
  const [urlMap, setUrlMap] = useState({}); // { [photoId]: presignedUrl }

  // 仅重签一次的保护
  const retriedRef = useRef(new Set());

  // userId（number 或 null）
  const userId = useMemo(() => {
    const raw = localStorage.getItem("userId");
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, []);

  // ---------- derived ----------
  const days = useMemo(() => {
    if (!selectedTrip?.startDate || !selectedTrip?.endDate) return 0;
    const d =
      Math.ceil(
        (new Date(selectedTrip.endDate) - new Date(selectedTrip.startDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1;
    return Math.max(d, 0);
  }, [selectedTrip?.startDate, selectedTrip?.endDate]);

  const filtered = useMemo(() => {
    const base = photos.filter((p) => p.dayIndex === selectedDayIndex);
    if (visibilityFilter === "all") return base;
    return base.filter((p) => p.visibility === visibilityFilter);
  }, [photos, selectedDayIndex, visibilityFilter]);

  const isOwner = selectedTrip?.userId === userId;

  // ---------- helpers ----------
  async function getViewUrl(p) {
    // public 直接用 imageUrl；private 需通过后端签发
    if (p.visibility === "public" && p.imageUrl) return p.imageUrl;
    if (!p.imageKey) return "";
    const r = await fetch(
      `${API_BASE}/api/upload/view-url?key=${encodeURIComponent(
        p.imageKey
      )}&expiresIn=300`
    );
    if (!r.ok) return "";
    const { url } = await r.json();
    return url || "";
  }

  // 出错时尝试仅重签一次，避免死循环
  async function retrySignAndSet(p) {
    if (!p?.id) return;
    if (retriedRef.current.has(p.id)) return;
    retriedRef.current.add(p.id);

    try {
      const fresh = await getViewUrl(p);
      if (!fresh) return;
      setUrlMap((prev) => ({ ...prev, [p.id]: fresh }));
    } catch (e) {
      console.warn("重新签名失败", e);
    }
  }

  // 批量签发当前需要显示的图（不要给预签名 URL 追加任何参数）
  useEffect(() => {
    let aborted = false;
    (async () => {
      const need = filtered.filter((p) => !urlMap[p.id]);
      if (!need.length) return;
      const entries = await Promise.all(
        need.map(async (p) => {
          try {
            const u = await getViewUrl(p);
            return [p.id, u]; // ⚠️ 不要 append query，保持原样
          } catch {
            return [p.id, ""];
          }
        })
      );
      if (!aborted) {
        setUrlMap((prev) => {
          const next = { ...prev };
          for (const [id, u] of entries) next[id] = u;
          return next;
        });
      }
    })();
    return () => {
      aborted = true;
    };
  }, [filtered.map((p) => p.id).join(",")]); // 仅依赖照片 id 集合变化

  // ---------- fetchers ----------
  const fetchTrips = async () => {
    if (userId == null) return;
    try {
      const res = await fetch(`${API_BASE}/api/trip/user/${userId}`);
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ 获取旅行失败", err);
      alert("获取旅行列表失败");
    }
  };

  const fetchPhotos = async (tripId) => {
    if (!tripId || userId == null) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/photo/trip/${tripId}?userId=${userId}`
      );
      const data = await res.json();
      setPhotos(Array.isArray(data) ? data : []);
      setUrlMap({}); // 切换行程时清空旧签名
      retriedRef.current = new Set(); // 清除重试标记
    } catch (err) {
      console.error("❌ 获取照片失败", err);
      alert("获取照片失败");
      setPhotos([]);
      setUrlMap({});
      retriedRef.current = new Set();
    }
  };

  const fetchLikes = async (photoId) => {
    if (!photoId || userId == null) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/photo/${photoId}/likes?userId=${userId}`
      );
      const data = await res.json();
      setLikes((prev) => ({ ...prev, [photoId]: data || {} }));
    } catch (err) {
      console.error("❌ 获取点赞信息失败", err);
    }
  };

  const fetchComments = async (photoId) => {
    if (!photoId) return;
    try {
      const res = await fetch(`${API_BASE}/api/photo/${photoId}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ 获取评论失败", err);
    }
  };

  // ---------- effects ----------
  useEffect(() => {
    fetchTrips();
  }, [userId]);

  useEffect(() => {
    if (!selectedTrip?.id) return;
    setVisibilityFilter("public");
    setSelectedDayIndex(1);
    fetchPhotos(selectedTrip.id);
  }, [selectedTrip?.id]);

  // ---------- actions ----------
  const handleLike = async (photoId) => {
    if (!photoId || userId == null) return;
    try {
      await fetch(`${API_BASE}/api/photo/${photoId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      fetchLikes(photoId);
    } catch (err) {
      console.error("❌ 点赞失败", err);
    }
  };

  const handleAddComment = async () => {
    if (!previewPhoto?.id || !newComment.trim() || userId == null) return;
    try {
      await fetch(`${API_BASE}/api/photo/${previewPhoto.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content: newComment }),
      });
      setNewComment("");
      fetchComments(previewPhoto.id);
    } catch (err) {
      console.error("❌ 评论失败", err);
    }
  };

  const handlePreview = async (p) => {
    let url = urlMap[p.id];
    if (p.visibility !== "public") {
      try {
        url = await getViewUrl(p);
        setUrlMap((prev) => ({ ...prev, [p.id]: url }));
      } catch {
        url = "";
      }
    }
    setPreviewPhoto({ ...p, _viewUrl: url || p.imageUrl || "" });
    fetchLikes(p.id);
    fetchComments(p.id);
  };

  // ⭐ 仅新增：删除照片（仅上传者可删）
  const handleDeletePhoto = async () => {
    if (!previewPhoto?.id) return;
    if (previewPhoto.uploadedBy !== userId) {
      alert("只能删除自己上传的照片");
      return;
    }
    const ok = window.confirm("确定删除这张照片？此操作不可恢复。");
    if (!ok) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/photo/${previewPhoto.id}?userId=${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        throw new Error((await res.text().catch(() => "")) || "删除失败");
      }
      // 本地移除并关闭弹窗
      setPhotos((prev) => prev.filter((p) => p.id !== previewPhoto.id));
      setPreviewPhoto(null);
      // 清掉缓存 URL
      setUrlMap((prev) => {
        const n = { ...prev };
        delete n[previewPhoto.id];
        return n;
      });
    } catch (e) {
      console.error("❌ 删除失败:", e);
      alert("删除失败：无权限或服务器错误");
    }
  };

  // ---------- render ----------
  return (
    <>
      <Navbar />
      <SubNavBar />
      <div className="trip-photo-page">
        <h2
          className="page-title"
          style={{ fontWeight: "bold", fontSize: "30px", textAlign: "center" }}
        >
          My Travel Footprints
        </h2>

        <div
          className="trip-dropdown-wrapper"
          style={{ textAlign: "center", marginBottom: "1rem" }}
        >
          <div className="trip-dropdown">
            <label style={{ fontWeight: "bold", textAlign: "center" }}>
              Choose Trip:
            </label>
            <select
              onChange={(e) => {
                const tid = Number(e.target.value);
                const trip = trips.find((t) => t.id === tid);
                setSelectedTrip(trip || null);
              }}
            >
              <option value="">-- Select a Trip --</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fromCity} → {t.destination}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedTrip && (
          <>
            <div className="filter-row" style={{ justifyContent: "center" }}>
              <div className="day-selector">
                <label style={{ fontWeight: "bold", textAlign: "center" }}>
                  Select Day:
                </label>
                <select
                  value={selectedDayIndex}
                  onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                >
                  {Array.from({ length: days }, (_, i) => (
                    <option key={i} value={i + 1}>
                      Day {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div className="visibility-filter">
                <label style={{ fontWeight: "bold" }}>Photo Visibility:</label>
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            <div className="photo-card">
              <div className="photo-card-content">
                <div className="left-column">
                  <h3 className="day-title">🗓️ Day {selectedDayIndex}</h3>
                  <div className="photo-grid">
                    {filtered.map((p) => {
                      const src = urlMap[p.id] || p.imageUrl || "";
                      return (
                        <div
                          key={p.id}
                          className="photo-item"
                          onClick={() => handlePreview(p)}
                          title={
                            p.visibility === "private"
                              ? "Private photo"
                              : "Public photo"
                          }
                        >
                          {src ? (
                            <img
                              src={src}
                              alt="Uploaded"
                              loading="lazy"
                              onError={() => retrySignAndSet(p)}
                              key={`${p.id}-${src}`}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                paddingTop: "75%",
                                background: "#eee",
                              }}
                            />
                          )}
                          <p>{p.placeName}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="right-column">
                  <UploadPhotoForm
                    tripId={selectedTrip.id}
                    dayIndex={selectedDayIndex}
                    onUpload={() => fetchPhotos(selectedTrip.id)}
                    isOwner={isOwner}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {previewPhoto && (
          <div className="modal" onClick={() => setPreviewPhoto(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <span className="close" onClick={() => setPreviewPhoto(null)}>
                &times;
              </span>

              {/* 删除按钮（仅上传者可见） */}
              {previewPhoto.uploadedBy === userId && (
                <button
                  onClick={handleDeletePhoto}
                  style={{
                    position: "absolute",
                    right: 56,
                    top: 10,
                    padding: "6px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                  title="删除照片"
                >
                  Delete
                </button>
              )}

              <h4
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {previewPhoto.placeName}
              </h4>
              <p style={{ textAlign: "center" }}>{previewPhoto.description}</p>
              <img
                src={
                  previewPhoto._viewUrl ||
                  urlMap[previewPhoto.id] ||
                  previewPhoto.imageUrl ||
                  ""
                }
                alt="Large Preview"
                className="modal-image"
                onError={() => retrySignAndSet(previewPhoto)}
                key={`${
                  previewPhoto.id
                }-${
                  previewPhoto._viewUrl ||
                  urlMap[previewPhoto.id] ||
                  previewPhoto.imageUrl ||
                  ""
                }`}
              />

              <div className="photo-interaction">
                <div className="like-section">
                  <button
                    className="like-button"
                    onClick={() => handleLike(previewPhoto.id)}
                  >
                    💜 Like
                  </button>
                  <p className="like-count">
                    👍 Like：{likes[previewPhoto.id]?.total || 0}
                  </p>
                </div>

                <div className="comment-section">
                  <h4 style={{ fontWeight: "bold" }}>💬 Comment</h4>
                  <ul className="comment-list">
                    {comments.map((c) => (
                      <li key={c.id}>
                        <strong>{c.user?.email || "User"}</strong>: {c.content}
                      </li>
                    ))}
                  </ul>

                  <textarea
                    className="comment-input"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="leave a comment..."
                  />
                  <button className="comment-submit" onClick={handleAddComment}>
                    Comment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
