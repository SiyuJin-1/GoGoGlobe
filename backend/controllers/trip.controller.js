console.log("✅ trip.controller.js 加载了");

const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const redisClient = require("../utils/redisClient");
const { sendToQueue } = require("../utils/rabbitmq");

// ✅ 保存 Trip（创建后清除 Redis 缓存）
exports.saveTrip = async (req, res) => {
  const { userId, fromCity, destination, startDate, endDate, schedule } = req.body;

  try {
    const newTrip = await prisma.trip.create({
      data: {
        userId: Number(userId),
        fromCity,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schedule,
        items: [],
      },
    });

    await redisClient.del(`user_trips_${userId}`);
    console.log(`🧹 清除缓存: user_trips_${userId}`);

    // ✅✅✅ 新增：发送通知消息
    const msg = {
      type: "trip_created",
      userId: Number(userId),
      tripId: newTrip.id,
      message: `🧳 Trip "${newTrip.destination}" created!`,
      timestamp: new Date().toISOString()
    };
    console.log("📤 发送通知消息:", msg);
    await sendToQueue(msg);

    res.json(newTrip);
  } catch (err) {
    console.error("❌ Failed to save trip:", err);
    res.status(500).json({ message: "Failed to save trip", error: err.message });
  }
};

// ✅ 获取用户所有 Trip（带 Redis 缓存）
exports.getTripsByUser = async (req, res) => {
  const { userId } = req.params;
  const uid = Number(userId);
  const redisKey = `user_trips_${uid}`;

  try {
    const cached = await redisClient.get(redisKey);
    if (cached) {
      console.log("⚡ Redis 缓存命中：user trips");
      return res.json(JSON.parse(cached));
    }

    const trips = await prisma.trip.findMany({
      where: {
        members: {
          some: { userId: uid },
        },
      },
      include: {
        items: true,
        members: {
          include: { user: true },
        },
      },
    });

    await redisClient.set(redisKey, JSON.stringify(trips), { EX: 60 });
    console.log("✅ Redis 缓存写入：user trips");

    res.json(trips);
  } catch (err) {
    console.error("❌ 获取 trips 失败:", err);
    res.status(500).json({ message: "Failed to fetch trips", error: err.message });
  }
};

// ✅ 删除 Trip（先查 userId，再清除缓存）
exports.deleteTrip = async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: Number(id) },
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await prisma.trip.delete({ where: { id: Number(id) } });
    await redisClient.del(`user_trips_${trip.userId}`);
    console.log(`🧹 清除缓存: user_trips_${trip.userId}`);

    res.json({ message: "Trip deleted" });
  } catch (err) {
    console.error("❌ 删除行程失败:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
};

// ✅ 更新 Trip（更新后清除缓存 + 发通知）
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const {
    userId,
    fromCity,
    destination,
    startDate,
    endDate,
    schedule,
    ...rest
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

    await redisClient.del(`user_trips_${userId}`);
    console.log(`🧹 清除缓存: user_trips_${userId}`);

    const msg = {
      type: "trip_updated",
      userId: Number(userId),
      tripId: updatedTrip.id,
      message: `✏️ Trip "${updatedTrip.destination}" was updated!`,
      timestamp: new Date().toISOString()
    };
    console.log("📤 发送通知消息:", msg);
    await sendToQueue(msg);

    res.json(updatedTrip);
  } catch (err) {
    console.error("❌ Failed to update trip:", err);
    res.status(500).json({ message: "Failed to update trip", error: err.message });
  }
};

// ✅ 获取单个 Trip（保持原样）
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

// ✅ 添加物品（加通知）
exports.addItemToTrip = async (req, res) => {
  console.log("🚀 addItemToTrip controller 被调用！");

  const tripId = Number(req.params.id);
  const { name, packed, assignedTo } = req.body;

  try {
    const newItem = await prisma.item.create({
      data: {
        name,
        packed,
        assignedTo,
        trip: { connect: { id: tripId } },
      },
    });

    console.log("✅ 添加物品成功:", newItem);

    // ✅✅✅ 如果有指派对象，发送通知
    if (assignedTo) {
      const user = await prisma.user.findFirst({ where: { email: assignedTo } });
      if (user) {
        const msg = {
          type: "item_assigned",
          userId: user.id,
          tripId,
          message: `🎒 You were assigned item "${name}" in trip ${tripId}`,
          timestamp: new Date().toISOString()
        };
        console.log("📤 发送通知消息:", msg);
        await sendToQueue(msg);
      }
    }

    res.json({ item: newItem });
  } catch (err) {
    console.error("❌ 添加物品失败:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ 清空物品（保持原样）
exports.clearItemsFromTrip = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.item.deleteMany({ where: { tripId: Number(id) } });

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

// ✅ 更新物品（加通知）
exports.updateItem = async (req, res) => {
  const { itemId } = req.params;
  const { packed, assignedTo } = req.body;

  try {
    const prev = await prisma.item.findUnique({ where: { id: Number(itemId) } });

    const updated = await prisma.item.update({
      where: { id: Number(itemId) },
      data: {
        packed,
        assignedTo,
      },
    });

    // ✅✅✅ 如果更换了指派人，通知新的人
    if (assignedTo && assignedTo !== prev.assignedTo) {
      const user = await prisma.user.findFirst({ where: { email: assignedTo } });
      if (user) {
        const msg = {
          type: "item_assigned",
          userId: user.id,
          tripId: prev.tripId,
          message: `You were reassigned item "${updated.name}" in trip ${prev.tripId}`,
          timestamp: new Date().toISOString()
        };
        console.log("📤 发送通知消息:", msg);
        await sendToQueue(msg);
      }
    }

    res.json({ message: "✅ 更新成功", item: updated });
  } catch (err) {
    console.error("❌ 更新物品失败:", err);
    res.status(500).json({ error: "更新失败", details: err.message });
  }
};
