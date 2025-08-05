const multer = require("multer");
const path = require("path");
const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// 设置上传图片的路径和文件名
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // ✅ 确保 uploads 文件夹存在
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
exports.uploadAccommodationImage = upload.single("image"); // 👈 路由中间件

// 👇 主处理函数
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

    res.status(201).json({ id: result.id, message: "添加成功" }); // ✅ 这里改了
  } catch (err) {
    console.error("❌ 添加住宿失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
};

// 获取指定 tripId 下所有住宿
exports.getAccommodationsByTrip = async (req, res) => {
  const { tripId } = req.query;

  if (!tripId) {
    return res.status(400).json({ message: "缺少 tripId 参数" });
  }

  try {
    const accommodations = await prisma.accommodation.findMany({
      where: {
        tripId: Number(tripId),
      },
      orderBy: {
        checkIn: "asc",
      },
    });

    res.json(accommodations);
  } catch (err) {
    console.error("❌ 获取住宿失败:", err);
    res.status(500).json({ message: "服务器错误" });
  }
};
