import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function NotificationList() {
  const { id } = useParams(); // 当前用户 ID
  const [notifications, setNotifications] = useState([]);
  const API_BASE = process.env.REACT_APP_API_BASE || "/api";



  useEffect(() => {
    const fetchNotifications = async () => {
      // 1) 先尝试从本地或路由拿
      let userId = localStorage.getItem("userId") || id;
      console.log("当前用户ID:", userId);

      // 2) 都没有就去会话接口拿一次
      if (!userId) {
        try {
          const meRes = await fetch(`${API_BASE}/auth/me`, {
            credentials: "include",
          });
          const ct = meRes.headers.get("content-type") || "";
          if (meRes.ok && ct.includes("application/json")) {
            const me = await meRes.json();
            if (me?.user?.id) {
              userId = String(me.user.id);
              localStorage.setItem("userId", userId);
            }
          }
        } catch (_) {}
      }

      if (!userId) return; // 仍然拿不到就直接返回

      try {
        const res = await fetch(
          `${API_BASE}/notification/user/${userId}`,
          { credentials: "include" }
        );
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          // 避免把 HTML 当 JSON
          console.warn("Expected JSON, got:", ct, "body:", await res.text());
          setNotifications([]);
          return;
        }
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ 获取通知失败", err);
      }
    };

    fetchNotifications();
  }, []); // ✅ 保持你的空依赖

  const markAsRead = async (notificationId) => {
    try {
      await fetch(
        `${API_BASE}/notification/${notificationId}/read`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("❌ 标记为已读失败", err);
    }
  };

  return (
    <div className="p-6 bg-[#f9fbfd] min-h-screen">
      <h2 className="text-2xl font-bold mb-6">🔔 通知列表</h2>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-lg">暂无通知</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl shadow-sm border px-6 py-4 transition duration-200 ${
                n.isRead ? "border-gray-300" : "border-yellow-400 bg-yellow-50"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="text-base font-medium text-gray-800">
                  {n.message}
                </div>
                <div className="text-sm text-gray-500 ml-4 whitespace-nowrap">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="mt-4 px-4 py-2 rounded-xl text-white font-semibold hover:opacity-90 transition"
                >
                  标记为已读
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
