// controllers/photoController.js
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();
const path = require("path");

// ✅ 上传照片，支持私密字段
exports.uploadPhotos = async (req, res) => {
  const { tripId, uploadedBy, dayIndex, placeName, description, visibility } = req.body;
  const files = req.files;
  console.log("📥 收到照片上传请求");

  try {
    const photos = await Promise.all(
      files.map(async (file) => {
        const imageUrl = `http://localhost:3001/uploads/${file.filename}`;
        return prisma.photo.create({
          data: {
            tripId: parseInt(tripId),
            uploadedBy: parseInt(uploadedBy),
            dayIndex: parseInt(dayIndex),
            placeName,
            description,
            imageUrl,
            visibility: visibility || "public",
          },
        });
      })
    );
    res.status(201).json(photos);
  } catch (err) {
    console.error("上传失败:", err);
    res.status(500).json({ message: "上传失败" });
  }
};

// ✅ 获取行程照片（仅公开 + 自己上传的私密）
exports.getPhotosByTripFiltered = async (req, res) => {
  const { tripId } = req.params;
  const userId = parseInt(req.query.userId);
  try {
    const photos = await prisma.photo.findMany({
      where: {
        tripId: parseInt(tripId),
        OR: [
          { visibility: "public" },
          { uploadedBy: userId, visibility: "private" },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(photos);
  } catch (err) {
    console.error("❌ 获取照片失败:", err);
    res.status(500).json({ message: "获取照片失败" });
  }
};

// ✅ 获取某天照片
exports.getPhotosByTripAndDay = async (req, res) => {
  const { tripId, dayIndex } = req.params;
  try {
    const photos = await prisma.photo.findMany({
      where: {
        tripId: parseInt(tripId),
        dayIndex: parseInt(dayIndex),
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ message: "获取失败" });
  }
};

// ✅ 点赞照片
exports.likePhoto = async (req, res) => {
  const { photoId } = req.params;
  const { userId } = req.body;
  try {
    const like = await prisma.like.create({
      data: {
        photoId: parseInt(photoId),
        userId: parseInt(userId),
      },
    });
    res.status(201).json(like);
  } catch (err) {
    console.error("❌ 点赞失败:", err);
    res.status(500).json({ message: "点赞失败" });
  }
};

// ✅ 取消点赞
exports.unlikePhoto = async (req, res) => {
  const { photoId } = req.params;
  const { userId } = req.body;
  try {
    await prisma.like.delete({
      where: {
        photoId_userId: {
          photoId: parseInt(photoId),
          userId: parseInt(userId),
        },
      },
    });
    res.status(204).end();
  } catch (err) {
    console.error("❌ 取消点赞失败:", err);
    res.status(500).json({ message: "取消点赞失败" });
  }
};

// ✅ 获取点赞信息
exports.getPhotoLikes = async (req, res) => {
  const { photoId } = req.params;
  const userId = parseInt(req.query.userId);
  try {
    const total = await prisma.like.count({ where: { photoId: parseInt(photoId) } });
    const liked = await prisma.like.findFirst({
      where: { photoId: parseInt(photoId), userId },
    });
    res.json({ total, liked: !!liked });
  } catch (err) {
    console.error("❌ 获取点赞失败:", err);
    res.status(500).json({ message: "获取点赞失败" });
  }
};

// ✅ 添加评论
exports.addComment = async (req, res) => {
  const { photoId } = req.params;
  const { userId, content } = req.body;
  try {
    const comment = await prisma.comment.create({
      data: {
        photoId: parseInt(photoId),
        userId: parseInt(userId),
        content,
      },
    });
    res.status(201).json(comment);
  } catch (err) {
    console.error("❌ 评论失败:", err);
    res.status(500).json({ message: "评论失败" });
  }
};

// ✅ 获取评论
exports.getComments = async (req, res) => {
  const { photoId } = req.params;
  try {
    const comments = await prisma.comment.findMany({
      where: { photoId: parseInt(photoId) },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(comments);
  } catch (err) {
    console.error("❌ 获取评论失败:", err);
    res.status(500).json({ message: "获取评论失败" });
  }
};

// ✅ 删除评论（仅限作者或管理员调用）
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;
  try {
    await prisma.comment.delete({
      where: { id: parseInt(commentId) },
    });
    res.status(204).end();
  } catch (err) {
    console.error("❌ 删除评论失败:", err);
    res.status(500).json({ message: "删除评论失败" });
  }
};
