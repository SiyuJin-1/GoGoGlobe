import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Navbar from "./Navbar";
import SubNavBar from "./SubNavBar";
import "./Member.css";

const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function MemberPage() {
  const { id } = useParams(); // 当前用户 ID
  const [tripData, setTripData] = useState([]); // 用户所有行程
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [memberData, setMemberData] = useState([]);
  const [newMemberUserId, setNewMemberUserId] = useState(""); // 用于添加成员

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/trip/user/${id}`);
        const trips = await res.json();
        if (Array.isArray(trips) && trips.length > 0) {
          setTripData(trips);
          setSelectedTripId(trips[0].id);
        }
      } catch (err) {
        console.error("❌ 获取行程失败:", err);
      }
    };
    fetchTrips();
  }, [id]);

  useEffect(() => {
    if (!selectedTripId) return;
    const fetchMembers = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/members?tripId=${selectedTripId}`);
        const members = await res.json();
        setMemberData(members);
      } catch (err) {
        console.error("❌ 获取成员失败:", err);
      }
    };
    fetchMembers();
  }, [selectedTripId]);

  const handleAddMember = async () => {
    const uid = parseInt(newMemberUserId);
    if (!uid || !selectedTripId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, tripId: selectedTripId, role: "Member" }),
      });
      const data = await res.json();
      if (!data || !data.id) {
        alert("❌ 添加失败");
        return;
      }
      setMemberData((prev) => [...prev, data]);
      setNewMemberUserId("");
    } catch (err) {
      console.error("❌ 添加成员失败:", err);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await fetch(`http://localhost:3001/api/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      setMemberData((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      console.error("❌ 更新角色失败:", err);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("确定要删除该成员吗？")) return;
    try {
      const res = await fetch(`http://localhost:3001/api/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        console.error("❌ 删除失败");
        return;
      }
      setMemberData((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error("❌ 删除成员失败:", err);
    }
  };

  return (
    <>
      <Navbar />
      <SubNavBar />
      <div className="members-page">
        <div className="trip-selector">
          <label htmlFor="tripSelect">Choose Trip：</label>
          <select
            id="tripSelect"
            value={selectedTripId ?? ""}
            onChange={(e) => setSelectedTripId(Number(e.target.value))}
          >
            <option value="">Choose Trip</option>
            {tripData.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.fromCity} ➝ {trip.destination}
              </option>
            ))}
          </select>
        </div>

        <div className="member-card">
          <div className="packing-header">
            <h3>Member List</h3>
          </div>

          <ul className="member-list">
            {memberData.map((member) => (
              <li key={member.id} className="member-item">
                <img
                  src={defaultAvatar}
                  alt="avatar"
                  className="member-avatar"
                />
                <div className="member-info">
                  <div className="member-email">{member.user?.email || "Unknown User"}</div>
                  <div className="member-tasks">Tasks: {member.tasks}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <select
                    className="member-role"
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  >
                    <option value="Captain">Captain</option>
                    <option value="Member">Member</option>
                  </select>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteMember(member.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer" }}
                    title="删除成员"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="grey"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
                {member.online && (
                  <span
                    style={{
                      marginLeft: "10px",
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#22c55e",
                      borderRadius: "50%",
                      display: "inline-block",
                    }}
                  ></span>
                )}
              </li>
            ))}
          </ul>

          <div className="add-member">
            <input
              type="number"
              placeholder="Enter User ID..."
              value={newMemberUserId}
              onChange={(e) => setNewMemberUserId(e.target.value)}
            />
            <button onClick={handleAddMember}>Add</button>
          </div>
        </div>
      </div>
    </>
  );
}