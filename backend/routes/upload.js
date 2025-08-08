const express = require("express");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const mime = require("mime-types");
const { v4: uuid } = require("uuid");

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // 如果你的进程是跑在 EC2/Lambda，也可以不显式传 credentials，走角色即可
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

// 兼容旧变量：S3_BUCKET_NAME（公开桶）
// 新变量：S3_BUCKET_PUBLIC（公开桶）、S3_BUCKET_PRIVATE（私有桶）
const PUBLIC_BUCKET =
  process.env.S3_BUCKET_PUBLIC || process.env.S3_BUCKET_NAME; // 住宿图
const PRIVATE_BUCKET = process.env.S3_BUCKET_PRIVATE;          // 照片

// 生成预签名 PUT URL（直传）
router.post("/sign", async (req, res) => {
  try {
    const { contentType, tripId, userId, kind = "accommodation" } = req.body;

    if (!contentType || !tripId || !userId) {
      return res.status(400).json({ message: "缺少参数" });
    }

    // 限制文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ message: "文件类型不支持" });
    }

    // 选择桶+前缀
    let bucket, prefix;
    if (kind === "accommodation") {
      bucket = PUBLIC_BUCKET;
      if (!bucket) return res.status(500).json({ message: "缺少公开桶环境变量 S3_BUCKET_PUBLIC 或 S3_BUCKET_NAME" });
      prefix = `public/${userId}/${tripId}`;
    } else if (kind === "photo") {
      bucket = PRIVATE_BUCKET;
      if (!bucket) return res.status(500).json({ message: "缺少私有桶环境变量 S3_BUCKET_PRIVATE" });
      prefix = `photos/${userId}/${tripId}`;
    } else {
      return res.status(400).json({ message: "无效 kind（应为 accommodation | photo）" });
    }

    const ext = mime.extension(contentType) || "bin";
    const key = `${prefix}/${uuid()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      // 不设置 ACL。公开访问由公开桶的“桶策略”控制；私有桶保持 Block Public Access。
    });

    // 预签名 URL 默认 15 分钟
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    // 住宿图（公开桶）返回可直接访问的 URL；照片（私有桶）不返回公开 URL
    const publicUrl =
      kind === "accommodation"
        ? `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
        : undefined;

    res.json({ uploadUrl, key, bucket, publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "生成签名失败" });
  }
});

// （可选）私有照片查看：生成 GET 预签名 URL
router.get("/view-url", async (req, res) => {
  try {
    const { key, bucket = PRIVATE_BUCKET, expiresIn = 300 } = req.query;
    if (!key) return res.status(400).json({ message: "缺少 key" });
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(s3, cmd, { expiresIn: Number(expiresIn) });
    res.json({ url, expiresIn: Number(expiresIn) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "生成查看链接失败" });
  }
});

module.exports = router;
