console.log("✅ trip routes loaded");

const express = require("express");
const router = express.Router();
const {
  saveTrip,
  getTripsByUser,
  deleteTrip, // ✅ 添加删除函数
  updateTrip, // ✅ 添加更新函数
  getTripById, // ✅ 添加获取单个行程函数
} = require("../controllers/trip.controller");

// 保存新的计划
router.post("/", (req, res, next) => {
  console.log("📨 POST /api/trip reached");
  next();
}, saveTrip);

// 获取当前用户的所有计划
router.get("/user/:userId", getTripsByUser);

// ✅ 删除计划
router.delete("/:id", deleteTrip);

router.put("/:id", updateTrip); 

router.get("/:id", getTripById);
module.exports = router;
