import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import AccommodationForm from "./AccommodationForm";
import "./Accommodation.css";

export default function AddAccommodationPage() {
  const { id } = useParams(); // 当前用户 ID
  const [tripList, setTripList] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [accommodations, setAccommodations] = useState([]);

  // 获取当前用户所有行程
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/trip/user/${id}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTripList(data);
          setSelectedTripId(data[0].id);
        }
      } catch (err) {
        console.error("❌ 获取行程失败:", err);
      }
    };
    fetchTrips();
  }, [id]);

  // 获取某个行程的住宿列表
  const loadAccommodations = async (tripId) => {
    try {
      const res = await fetch(`http://localhost:3001/api/accommodations?tripId=${tripId}`);
      const data = await res.json();
      setAccommodations((data || []).sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn)));
    } catch (err) {
      console.error("❌ 获取住宿失败:", err);
    }
  };

  // 当选中的 tripId 变化时重新加载住宿
  useEffect(() => {
    if (selectedTripId) {
      loadAccommodations(selectedTripId);
    }
  }, [selectedTripId]);

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
            <h3>Unuploaded accommodations</h3>
            {accommodations.length === 0 ? (
              <p>No recording</p>
            ) : (
              accommodations.map((acc) => (
                console.log("📷 imageUrl:", acc.imageUrl),
                <div className="accommodation-card" key={acc.id}>
                  <div className="date-label">
                    {new Date(acc.checkIn).toLocaleDateString()} → {new Date(acc.checkOut).toLocaleDateString()}
                  </div>

                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <img
  src={`http://localhost:3001${acc.imageUrl}`}
  alt="accommodation"
  className="thumbnail"
/>
    <div className="card-info">
      <h4>{acc.name || "未命名住宿"}</h4>
      <p>{acc.address || "暂无地址"}</p>
      {acc.bookingUrl && (
        <a href={acc.bookingUrl} target="_blank" rel="noreferrer">
          🔗 Link
        </a>
      )}
    </div>
  </div>
</div>


                ))
            )}
          </div>

          {/* 右侧上传表单 */}
          <div className="form-column">
            <AccommodationForm
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
