console.log("✅ trip routes loaded");

const express = require("express");
const router = express.Router();
const {
  saveTrip,
  getTripsByUser,
  deleteTrip,
  updateTrip,
  getTripById,
  addItemToTrip, // ✅ 添加新控制器函数
  clearItemsFromTrip,
  updateItem
} = require("../controllers/trip.controller");

router.post("/", (req, res, next) => {
  console.log("📨 POST /api/trip reached");
  next();
}, saveTrip);

// ✅ 新增：添加物品到 trip 的 items 中
router.put("/item/:itemId", updateItem);
router.post("/:id/add-item",  addItemToTrip);
router.delete("/:id/clear-items", clearItemsFromTrip);
router.get("/user/:userId", getTripsByUser);
router.delete("/:id", deleteTrip);
router.put("/:id", updateTrip);
router.get("/:id", getTripById);



module.exports = router;
