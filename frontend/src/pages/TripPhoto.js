import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import "./TripPhoto.css";
import UploadPhotoForm from "./UploadPhotoForm";

export default function TripPhotoPage() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("public");

  const userId = localStorage.getItem("userId");

  const fetchPhotos = async (tripId) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/photo/trip/${tripId}?userId=${userId}`
      );
      const data = await res.json();
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ 获取照片失败", err);
      alert("获取照片失败");
      setPhotos([]);
    }
  };

  const fetchLikes = async (photoId) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/photo/${photoId}/likes?userId=${userId}`
      );
      const data = await res.json();
      setLikes((prev) => ({ ...prev, [photoId]: data }));
    } catch (err) {
      console.error("❌ 获取点赞信息失败", err);
    }
  };

  const fetchComments = async (photoId) => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/photo/${photoId}/comments`
      );
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error("❌ 获取评论失败", err);
    }
  };

  useEffect(() => {
    const fetchTrips = async () => {
      if (!userId) return;
      try {
        const res = await fetch(
          `http://localhost:3001/api/trip/user/${userId}`
        );
        const data = await res.json();
        setTrips(data);
      } catch (err) {
        console.error("❌ 获取旅行失败", err);
        alert("\u83b7\u53d6\u65c5\u884c\u5217\u8868\u5931\u8d25");
      }
    };
    fetchTrips();
  }, [userId]);

  useEffect(() => {
    if (!selectedTrip) return;
    fetchPhotos(selectedTrip.id);
    setVisibilityFilter("public");
  }, [selectedTrip]);

  const days = selectedTrip
    ? Math.ceil(
        (new Date(selectedTrip.endDate) -
          new Date(selectedTrip.startDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1
    : 0;

  const handleLike = async (photoId) => {
    try {
      await fetch(`http://localhost:3001/api/photo/${photoId}/like`, {
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
    try {
      await fetch(
        `http://localhost:3001/api/photo/${previewPhoto.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, content: newComment }),
        }
      );
      setNewComment("");
      fetchComments(previewPhoto.id);
    } catch (err) {
      console.error("❌ 评论失败", err);
    }
  };

  const handlePreview = (p) => {
    setPreviewPhoto(p);
    fetchLikes(p.id);
    fetchComments(p.id);
  };

  const isOwner = selectedTrip?.createdBy == userId;

  return (
    <>
      <Navbar />
      <SubNavBar />
      <div className="trip-photo-page">
        <h2 className="page-title" style={{ fontWeight: "bold", textAlign: "center" }}> My Travel Footprints</h2>
        <div className="trip-dropdown-wrapper">
          <div className="trip-dropdown">
            <label>Choose Trip:</label>
            <select
              onChange={(e) => {
                const trip = trips.find(
                (t) => t.id === parseInt(e.target.value)
              );
              setSelectedTrip(trip || null);
              setSelectedDayIndex(1);
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
          <div className="filter-row">
            <div className="day-selector">
              <label style={{ fontWeight: "bold" }}>Select Day:</label>
              <select
                value={selectedDayIndex}
                onChange={(e) => setSelectedDayIndex(parseInt(e.target.value))}
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
          </>
        )}

        {selectedTrip && (
          <div className="photo-card">
            <div className="photo-card-content">
              <div className="left-column">
                <h3 className="day-title">🗓️ Day {selectedDayIndex}</h3>
                <div className="photo-grid">
                  {photos
                    .filter((p) => p.dayIndex === selectedDayIndex)
                    .filter((p) => {
                      if (visibilityFilter === "all") return true;
                      return p.visibility === visibilityFilter;
                    })
                    .map((p) => (
                      <div
                        key={p.id}
                        className="photo-item"
                        onClick={() => handlePreview(p)}
                      >
                        <img src={p.imageUrl} alt="Uploaded" />
                        <p>
                          {p.placeName}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="right-column">
                <UploadPhotoForm
                  tripId={selectedTrip.id}
                  dayIndex={selectedDayIndex}
                  onUpload={() => fetchPhotos(selectedTrip.id)}
                />
              </div>
            </div>
          </div>
        )}

        {previewPhoto && (
          <div className="modal" onClick={() => setPreviewPhoto(null)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="close" onClick={() => setPreviewPhoto(null)}>
                &times;
              </span>
              <h4 style={{ fontSize: "2rem", fontWeight: "bold" }}>{previewPhoto.placeName}</h4>
              <p>{previewPhoto.description}</p>
              <img
                src={previewPhoto.imageUrl}
                alt="Large Preview"
                className="modal-image"
              />

<div className="photo-interaction">
  <div className="like-section">
    <button className="like-button" onClick={() => handleLike(previewPhoto.id)}>💜 点赞</button>
    <p className="like-count">👍 Like：{likes[previewPhoto.id]?.total || 0}</p>
  </div>

  <div className="comment-section">
    <h4>💬 Comment</h4>
    <ul className="comment-list">
      {comments.map((c) => (
        <li key={c.id}>
          <strong>{c.user.email}</strong>: {c.content}
        </li>
      ))}
    </ul>

    <textarea
      className="comment-input"
      value={newComment}
      onChange={(e) => setNewComment(e.target.value)}
      placeholder="leave a comment..."
    />
    <button className="comment-submit" onClick={handleAddComment}>提交评论</button>
  </div>
</div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
