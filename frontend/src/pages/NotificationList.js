import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function NotificationList() {
  const { id } = useParams(); // 当前用户 ID
  const [notifications, setNotifications] = useState([]);

useEffect(() => {
  const fetchNotifications = async () => {
    const userId = localStorage.getItem("userId");
    console.log("当前用户ID:", userId); // 👈 加上这句

    if (!userId) return; // 没有登录，直接跳过

    try {
      const res = await fetch(`http://localhost:3001/api/notification/user/${userId}`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("❌ 获取通知失败", err);
    }
  };

  fetchNotifications();
}, []); // ✅ 空依赖数组，不再依赖 URL 参数 id


  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:3001/api/notification/${notificationId}/read`, {
        method: "PATCH",
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
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
                <div className="text-base font-medium text-gray-800">{n.message}</div>
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
