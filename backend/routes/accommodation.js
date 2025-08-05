const express = require("express");
const router = express.Router();
const controller = require("../controllers/accommodationController");

router.post(
  "/",
  controller.uploadAccommodationImage, // 👈 先处理图片上传
  controller.createAccommodation       // 👈 再保存数据
);

router.get("/", controller.getAccommodationsByTrip);

module.exports = router;
