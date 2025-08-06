const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

exports.getNotificationsByUser = async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(notifications);
  } catch (err) {
    console.error("❌ 获取通知失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
};

exports.markAsRead = async (req, res) => {
  const notificationId = parseInt(req.params.id);
  try {
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ 标记为已读失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
};

// ✅ 获取未读通知数量
exports.getUnreadCountByUser = async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    res.json({ count });
  } catch (err) {
    console.error("❌ 获取未读通知数量失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
};

