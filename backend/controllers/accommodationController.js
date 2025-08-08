// backend/controllers/accommodationController.js

const { PrismaClient } = require("../generated/prisma");
const redisClient = require("../utils/redisClient");
const { sendToQueue } = require("../utils/rabbitmq");

// 可选：删除 S3 上的图片（只有当表里保存了 imageKey 才会用到）
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const prisma = new PrismaClient();

const s3 =
  process.env.AWS_REGION
    ? new S3Client({
        region: process.env.AWS_REGION,
        credentials: process.env.AWS_ACCESS_KEY_ID
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // 如果在有角色的环境运行，可不传 credentials
      })
    : null;

/**
 * 创建住宿
 * 仅接收 JSON：{ tripId, name, address?, checkIn, checkOut, bookingUrl?, imageUrl?, imageKey? }
 * imageUrl / imageKey 来自前端直传 S3 后返回
 */
exports.createAccommodation = async (req, res) => {
  try {
    const {
      tripId,
      name,
      address,
      checkIn,
      checkOut,
      bookingUrl,
      imageUrl, // 可选：S3 可访问 URL
      imageKey, // 可选：S3 对象 key
    } = req.body;

    if (!tripId || !name || !checkIn || !checkOut) {
      return res.status(400).json({ message: "缺少必填字段" });
    }

    const created = await prisma.accommodation.create({
      data: {
        tripId: Number(tripId),
        name,
        address: address || null,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        bookingUrl: bookingUrl || null,
        imageUrl: imageUrl || null,
        imageKey: imageKey || null, // 如果你的表里没这个字段，可以删掉
      },
    });

    // 清缓存
    await redisClient.del(`accommodations_${tripId}`);

    // 通知成员
    const members = await prisma.member.findMany({
      where: { tripId: Number(tripId) },
      include: { user: true },
    });
    for (const m of members) {
      await sendToQueue({
        type: "accommodation_created",
        userId: m.userId,
        tripId: Number(tripId),
        message: `New accommodation "${name}" added to your trip.`,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(201).json({ id: created.id, message: "添加成功" });
  } catch (err) {
    console.error("❌ 添加住宿失败:", err);
    return res.status(500).json({ message: "服务器错误" });
  }
};

/**
 * 获取指定 tripId 的住宿列表（带 Redis 缓存）
 */
exports.getAccommodationsByTrip = async (req, res) => {
  const { tripId } = req.query;
  if (!tripId) return res.status(400).json({ message: "缺少 tripId 参数" });

  const cacheKey = `accommodations_${tripId}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("⚡ Redis 命中");
      return res.json(JSON.parse(cached));
    }

    const list = await prisma.accommodation.findMany({
      where: { tripId: Number(tripId) },
      orderBy: { checkIn: "asc" },
    });

    await redisClient.set(cacheKey, JSON.stringify(list), { EX: 60 });
    console.log("✅ Redis 缓存写入");

    return res.json(list);
  } catch (err) {
    console.error("❌ 获取住宿失败:", err);
    return res.status(500).json({ message: "服务器错误" });
  }
};

/**
 * 删除住宿（顺带删除 S3 中的图片 & 清缓存）
 * DELETE /api/accommodations/:id
 */
exports.deleteAccommodation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "无效的 id" });

    // 先查到记录，拿 tripId / imageKey
    const acc = await prisma.accommodation.findUnique({ where: { id } });
    if (!acc) return res.status(404).json({ message: "不存在" });

    // 尝试删除 S3 对象（只有有 imageKey 且配置了 S3 客户端时才会执行）
    if (acc.imageKey && s3) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: acc.imageKey,
          })
        );
      } catch (e) {
        // 不因为删图失败而阻断业务
        console.warn("⚠️ 删除 S3 对象失败：", e?.message || e);
      }
    }

    // 删数据库记录
    await prisma.accommodation.delete({ where: { id } });

    // 清缓存
    await redisClient.del(`accommodations_${acc.tripId}`);

    return res.status(204).send(); // No Content
  } catch (err) {
    console.error("❌ 删除住宿失败:", err);
    return res.status(500).json({ message: "服务器错误" });
  }
};

/**
 * 更新住宿（部分字段即可）
 * PATCH /api/accommodations/:id
 * body 支持：name, address, checkIn, checkOut, bookingUrl, imageUrl?, imageKey?
 * 如果传了新的 imageUrl/imageKey，且旧记录有 imageKey，会尝试删除旧 S3 对象
 */
exports.updateAccommodation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "无效的 id" });

    const old = await prisma.accommodation.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ message: "不存在" });

    const {
      name,
      address,
      checkIn,
      checkOut,
      bookingUrl,
      imageUrl,
      imageKey,
    } = req.body;

    // 组装可更新字段（只更新传进来的）
    const data = {};
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (checkIn !== undefined) data.checkIn = new Date(checkIn);
    if (checkOut !== undefined) data.checkOut = new Date(checkOut);
    if (bookingUrl !== undefined) data.bookingUrl = bookingUrl;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (imageKey !== undefined) data.imageKey = imageKey || null;

    // 如传入了新的 imageKey 且与旧的不同，尝试删旧图（可选）
    if (imageKey && old.imageKey && imageKey !== old.imageKey && s3) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: old.imageKey,
          })
        );
      } catch (e) {
        console.warn("⚠️ 删除旧 S3 对象失败：", e?.message || e);
      }
    }

    const updated = await prisma.accommodation.update({
      where: { id },
      data,
    });

    // 清缓存（用 updated.tripId 更稳）
    await redisClient.del(`accommodations_${updated.tripId}`);

    return res.json({ id: updated.id, message: "更新成功" });
  } catch (err) {
    console.error("❌ 更新住宿失败:", err);
    return res.status(500).json({ message: "服务器错误" });
  }
};