console.log("✅ trip.controller.js 加载了");

const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

exports.saveTrip = async (req, res) => {
  const { userId, fromCity, destination, startDate, endDate, schedule } = req.body;

  try {
    const newTrip = await prisma.trip.create({
      data: {
        userId: Number(userId),
        fromCity,                      // ✅ 新增：出发城市
        destination,                  // ✅ 新增：目的地
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schedule,
        items: [], // 初始化 items 数组
      },
    });

    res.json(newTrip);
  } catch (err) {
    console.error("❌ Failed to save trip:", err);
    res.status(500).json({ message: "Failed to save trip", error: err.message });
  }
};

exports.getTripsByUser = async (req, res) => {
  const { userId } = req.params;
  const uid = Number(userId);

  try {
    const trips = await prisma.trip.findMany({
      where: {
        members: {
          some: { userId: uid }, // 查询成员表里有该用户参与的所有 trip
        },
      },
      include: {
        items: true,     // 包含 items
        members: {
          include: {
            user: true,  // 包含成员信息（email、id等）
          },
        },
      },
    });

    res.json(trips);
  } catch (err) {
    console.error("❌ Failed to fetch user trips:", err);
    res.status(500).json({ message: "Failed to fetch trips", error: err.message });
  }
};


exports.deleteTrip = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.trip.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Trip deleted" });
  } catch (err) {
    console.error("❌ 删除行程失败:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
};
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const {
  userId,
  fromCity,
  destination,
  startDate,
  endDate,
  schedule,
  ...rest // 捕获并排除非法字段
} = req.body;

if ("items" in rest) {
  console.warn("⚠️ 已自动忽略非法字段 items");
}
  try {
    const updatedTrip = await prisma.trip.update({
      where: { id: Number(id) },
      data: {
        userId: Number(userId),
        fromCity,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schedule,
      },
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error("❌ Failed to update trip:", err);
    res.status(500).json({ message: "Failed to update trip", error: err.message });
  }
};

exports.getTripById = async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: Number(id) },
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(trip);
  } catch (err) {
    console.error("❌ 获取行程失败:", err);
    res.status(500).json({ message: "服务器出错", error: err.message });
  }
};

exports.addItemToTrip = async (req, res) => {
  console.log("🚀 addItemToTrip controller 被调用！");

  const tripId = Number(req.params.id);
  const { name, packed, assignedTo } = req.body;

  try {
    // 用 item.create 插入并关联到 trip
    const newItem = await prisma.item.create({
      data: {
        name,
        packed,
        assignedTo,
        trip: { connect: { id: tripId } }, // 关联 trip
      },
    });

    console.log("✅ 添加物品成功:", newItem);
    res.json({ item: newItem }); // ✅ 只返回这个新 item
  } catch (err) {
    console.error("❌ 添加物品失败:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.clearItemsFromTrip = async (req, res) => {
  const { id } = req.params;

  try {
    // 删除所有 item
    await prisma.item.deleteMany({
      where: {
        tripId: Number(id),
      },
    });

    // 返回最新 trip 数据（可选）
    const updatedTrip = await prisma.trip.findUnique({
      where: { id: Number(id) },
      include: { items: true },
    });

    console.log("🧹 清空成功:", updatedTrip);
    res.json(updatedTrip);
  } catch (err) {
    console.error("❌ 清空失败:", err);
    res.status(500).json({ message: "Failed to clear items", error: err.message });
  }
};

exports.updateItem = async (req, res) => {
  const { itemId } = req.params;
  const { packed, assignedTo } = req.body;

  try {
    const updated = await prisma.item.update({
      where: { id: Number(itemId) },
      data: {
        packed,
        assignedTo,
      },
    });

    res.json({ message: "✅ 更新成功", item: updated });
  } catch (err) {
    console.error("❌ 更新物品失败:", err);
    res.status(500).json({ error: "更新失败", details: err.message });
  }
};


