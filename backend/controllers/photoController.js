// controllers/photoController.js
const { PrismaClient } = require("../generated/prisma");
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const prisma = new PrismaClient();

const REGION = process.env.AWS_REGION || "us-east-2";
const PRIVATE_BUCKET = process.env.S3_BUCKET_PRIVATE; // 私有桶（照片）
const PUBLIC_BUCKET  = process.env.S3_BUCKET_PUBLIC || process.env.S3_BUCKET_NAME; // 公开桶（可选）

const s3 = new S3Client({
  region: REGION,
  credentials: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }
    : undefined
});

/**
 * 创建照片记录（S3 已直传，这里只落库）
 * body: { tripId, uploadedBy, dayIndex, placeName?, description?, visibility: 'public'|'private', imageKey, imageUrl? }
 * - public：imageUrl 可直接存 S3 直链
 * - private：imageUrl 可为空；显示时走 GET 预签名
 */
exports.createPhoto = async (req, res) => {
  try {
    const {
      tripId,
      uploadedBy,
      dayIndex,
      placeName,
      description,
      visibility = "public",
      imageKey,
      imageUrl
    } = req.body;

    if (!tripId || !uploadedBy || !dayIndex || !imageKey) {
      return res.status(400).json({ message: "缺少必填字段" });
    }
    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({ message: "visibility 必须为 public 或 private" });
    }

    const row = await prisma.photo.create({
      data: {
        tripId: Number(tripId),
        uploadedBy: Number(uploadedBy),
        dayIndex: Number(dayIndex),
        placeName: placeName || null,
        description: description || null,
        visibility,
        imageKey,          // ⭐ 保存 S3 对象 key
        imageUrl: imageUrl || null // public 时存直链；private 可以为空
      }
    });

    res.status(201).json({ id: row.id });
  } catch (e) {
    console.error("❌ createPhoto error:", e);
    res.status(500).json({ message: "服务器错误" });
  }
};

/**
 * 获取行程照片（支持 filter：public/private/all）
 * 非行程创建者：all 也看不到别人的私密
 * 返回时不生成私有预签名 URL，前端单独调用 /api/photo/:id/url
 */
exports.getPhotosByTripFiltered = async (req, res) => {
  const { tripId } = req.params;
  const userId = Number(req.query.userId);
  const filter = req.query.filter || "public";

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: Number(tripId) },
      select: { userId: true } 
    });
    const isOwner = trip && trip.userId === userId;

    const where = { tripId: Number(tripId) };

    if (filter === "all") {
      if (!isOwner) {
        where.OR = [
          { visibility: "public" },
          { uploadedBy: userId, visibility: "private" }
        ];
      }
      // owner 看全部，不加额外条件
    } else if (filter === "private") {
      where.uploadedBy = userId;
      where.visibility = "private";
    } else { // public
      where.OR = [
        { visibility: "public" },
        { uploadedBy: userId, visibility: "private" }
      ];
    }

    const rows = await prisma.photo.findMany({
      where,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        tripId: true,
        uploadedBy: true,
        dayIndex: true,
        placeName: true,
        description: true,
        visibility: true,
        imageKey: true,
        imageUrl: true,
        createdAt: true
      }
    });

    res.json(rows);
  } catch (e) {
    console.error("❌ getPhotosByTripFiltered error:", e);
    res.status(500).json({ message: "服务器错误" });
  }
};

/**
 * 生成私有照片的短期查看 URL（GET 预签名）
 * GET /api/photo/:id/url?expiresIn=300
 */
exports.getPhotoViewUrl = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const expiresIn = Number(req.query.expiresIn || 300);

    const p = await prisma.photo.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ message: "不存在" });

    if (p.visibility === "public" && p.imageUrl) {
      // 公共照片直接返回已有 URL（也可以选择仍然签一个 GET, 但没必要）
      return res.json({ url: p.imageUrl, expiresIn: 0 });
    }

    // 私有：必须有 key，桶为私有桶
    if (!p.imageKey) return res.status(400).json({ message: "缺少 imageKey" });
    const cmd = new GetObjectCommand({
      Bucket: PRIVATE_BUCKET,
      Key: p.imageKey
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn });
    res.json({ url, expiresIn });
  } catch (e) {
    console.error("❌ getPhotoViewUrl error:", e);
    res.status(500).json({ message: "服务器错误" });
  }
};

/**
 * 删除照片（仅上传者可删）+ 删除 S3 对象
 * DELETE /api/photo/:id?userId=123
 */
exports.deletePhoto = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const requester = Number(req.query.userId ?? req.body?.userId); // 也可从登录态取

    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "参数错误：id" });
    }
    if (!Number.isFinite(requester)) {
      return res.status(400).json({ message: "缺少 userId" });
    }

    // 先查出照片
    const p = await prisma.photo.findUnique({ where: { id } });
    if (!p) return res.status(404).json({ message: "不存在" });

    // 只有上传者可删
    if (requester !== p.uploadedBy) {
      return res.status(403).json({ message: "无权限删除" });
    }

    // 先删 DB，再尝试删 S3（S3 失败不影响响应）
    await prisma.photo.delete({ where: { id } });

    if (p.imageKey) {
      const bucket = p.visibility === "public" ? PUBLIC_BUCKET : PRIVATE_BUCKET;
      if (bucket) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: p.imageKey }));
        } catch (e) {
          // 记录但不阻断
          console.warn("删除 S3 对象失败（已忽略）:", e?.message || e);
        }
      }
    }

    res.status(204).end();
  } catch (e) {
    console.error("❌ deletePhoto error:", e);
    res.status(500).json({ message: "服务器错误" });
  }
};


// 其余：点赞/取消赞/获取点赞/评论增删查 —— 保持你原来的实现
exports.likePhoto = async (req, res) => {
  const { photoId } = req.params;
  const { userId } = req.body;
  try {
    const like = await prisma.like.create({
      data: { photoId: Number(photoId), userId: Number(userId) }
    });
    res.status(201).json(like);
  } catch (e) {
    console.error("❌ 点赞失败:", e);
    res.status(500).json({ message: "点赞失败" });
  }
};

exports.unlikePhoto = async (req, res) => {
  const { photoId } = req.params;
  const { userId } = req.body;
  try {
    await prisma.like.delete({
      where: { photoId_userId: { photoId: Number(photoId), userId: Number(userId) } }
    });
    res.status(204).end();
  } catch (e) {
    console.error("❌ 取消点赞失败:", e);
    res.status(500).json({ message: "取消点赞失败" });
  }
};

exports.getPhotoLikes = async (req, res) => {
  const { photoId } = req.params;
  const userId = Number(req.query.userId);
  try {
    const total = await prisma.like.count({ where: { photoId: Number(photoId) } });
    const liked = await prisma.like.findFirst({ where: { photoId: Number(photoId), userId } });
    res.json({ total, liked: !!liked });
  } catch (e) {
    console.error("❌ 获取点赞失败:", e);
    res.status(500).json({ message: "获取点赞失败" });
  }
};

exports.addComment = async (req, res) => {
  const { photoId } = req.params;
  const { userId, content } = req.body;
  try {
    const comment = await prisma.comment.create({
      data: { photoId: Number(photoId), userId: Number(userId), content }
    });
    res.status(201).json(comment);
  } catch (e) {
    console.error("❌ 评论失败:", e);
    res.status(500).json({ message: "评论失败" });
  }
};

exports.getComments = async (req, res) => {
  const { photoId } = req.params;
  try {
    const comments = await prisma.comment.findMany({
      where: { photoId: Number(photoId) },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: "asc" }
    });
    res.json(comments);
  } catch (e) {
    console.error("❌ 获取评论失败:", e);
    res.status(500).json({ message: "获取评论失败" });
  }
};

exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  try {
    await prisma.comment.delete({ where: { id: Number(commentId) } });
    res.status(204).end();
  } catch (e) {
    console.error("❌ 删除评论失败:", e);
    res.status(500).json({ message: "删除评论失败" });
  }
};
