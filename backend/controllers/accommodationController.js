// backend/controllers/accommodationController.js

const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("../generated/prisma");
const redisClient = require("../utils/redisClient");
const { sendToQueue } = require("../utils/rabbitmq");

const prisma = new PrismaClient();

// ✅ 设置上传图片的路径和文件名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // 确保 uploads 文件夹存在
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

// ✅ 上传中间件
const upload = multer({ storage: storage });
exports.uploadAccommodationImage = upload.single("image");

// ✅ 创建住宿（含图片上传 + 清除缓存）
exports.createAccommodation = async (req, res) => {
  const {
    tripId,
    name,
    address,
    checkIn,
    checkOut,
    bookingUrl
  } = req.body;

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!tripId || !name || !address || !checkIn || !checkOut) {
    return res.status(400).json({ message: "缺少必填字段" });
  }

  try {
    const result = await prisma.accommodation.create({
      data: {
        tripId: Number(tripId),
        name,
        address,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        bookingUrl,
        imageUrl,
      },
    });

    // ✅ 清除 Redis 缓存（保证下次 GET 拿到的是最新数据）
    const redisKey = `accommodations_${tripId}`;
    await redisClient.del(redisKey);
    console.log(`🧹 清除缓存: ${redisKey}`);

    // ✅✅✅ 新增：发送通知给 trip 所有成员
    const members = await prisma.member.findMany({
      where: { tripId: Number(tripId) },
      include: { user: true }
    });

        for (const member of members) {
      const messageObj = {
        type: "accommodation_created",  // ✅ 必填字段
        userId: member.userId,
        tripId: Number(tripId),
        message: `New accommodation "${name}" added to your trip.`,
        timestamp: new Date().toISOString() // ✅ 可选，但最好加
      };

      console.log("📤 发送通知消息:", messageObj);  // 👉 Debug log
      await sendToQueue(messageObj);
    }


    res.status(201).json({ id: result.id, message: "添加成功" });
  } catch (err) {
    console.error("❌ 添加住宿失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
};

// ✅ 获取指定 tripId 下所有住宿（带 Redis 缓存）
exports.getAccommodationsByTrip = async (req, res) => {
  const { tripId } = req.query;

  if (!tripId) {
    return res.status(400).json({ message: "缺少 tripId 参数" });
  }

  const redisKey = `accommodations_${tripId}`;

  try {
    // ✅ 优先从 Redis 获取
    const cached = await redisClient.get(redisKey);
    if (cached) {
      console.log("⚡ Redis 命中");
      return res.json(JSON.parse(cached));
    }

    // ❌ Redis 未命中，查询数据库
    const accommodations = await prisma.accommodation.findMany({
      where: { tripId: Number(tripId) },
      orderBy: { checkIn: "asc" },
    });

    // ✅ 写入 Redis 缓存，60 秒有效
    await redisClient.set(redisKey, JSON.stringify(accommodations), { EX: 60 });
    console.log("✅ Redis 缓存写入");

    res.json(accommodations);
  } catch (err) {
    console.error("❌ 获取住宿失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
};
