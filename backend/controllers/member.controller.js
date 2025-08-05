const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// 获取指定 trip 的成员，带出用户信息
exports.getMembersByTrip = async (req, res) => {
  const tripId = Number(req.query.tripId);
  if (!tripId) return res.status(400).json({ error: "tripId is required" });

  try {
    const members = await prisma.member.findMany({
      where: { tripId },
      include: {
        user: true, // ✅ 带出关联的用户信息，如 email
      },
    });
    res.json(members);
  } catch (err) {
    console.error("❌ 获取成员失败:", err);
    res.status(500).json({ error: "Failed to fetch members" });
  }
};

// 添加成员（基于 userId 和 tripId）
// 添加成员（基于 userId 和 tripId）
exports.addMember = async (req, res) => {
  const { userId, tripId, role = "Member" } = req.body;
  if (!userId || !tripId) {
    return res.status(400).json({ error: "userId and tripId are required" });
  }

  try {
    // 🔍 检查该 user 是否已是成员
    const existing = await prisma.member.findFirst({
      where: {
        userId: Number(userId),
        tripId: Number(tripId),
      },
    });

    if (existing) {
      return res.status(400).json({ error: "该用户已经在此行程中，不能重复添加。" });
    }

    // ✅ 创建新成员
    const newMember = await prisma.member.create({
      data: {
        userId,
        tripId,
        role,
      },
      include: {
        user: true,
      },
    });

    // 🧠 查找队长并复制物品逻辑保持不变
    const captain = await prisma.member.findFirst({
      where: {
        tripId: tripId,
        role: "Captain",
      },
    });

    if (captain) {
      const captainItems = await prisma.item.findMany({
        where: {
          tripId: tripId,
          assignedTo: String(captain.userId),
        },
      });

      const newItems = captainItems.map((item) => ({
        name: item.name,
        packed: false,
        tripId: tripId,
        assignedTo: String(userId),
      }));

      if (newItems.length > 0) {
        await prisma.item.createMany({
          data: newItems,
        });
      }
    }

    res.json(newMember);
  } catch (err) {
    console.error("❌ 添加成员失败:", err);
    res.status(500).json({ error: "Failed to add member" });
  }
};

// 删除成员
exports.deleteMember = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "member id is required" });

  try {
    await prisma.member.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ 删除成员失败:", err);
    res.status(500).json({ error: "Failed to delete member" });
  }
};

// 修改成员角色
exports.updateMemberRole = async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body;

  if (!role) return res.status(400).json({ error: "Missing role" });

  try {
    const updated = await prisma.member.update({
      where: { id },
      data: { role },
    });
    res.json(updated);
  } catch (err) {
    console.error("❌ 修改角色失败:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
};
