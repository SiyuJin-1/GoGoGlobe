// routes/photo.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const photoController = require("../controllers/photoController");

// POST 上传照片（支持批量上传）
router.post("/", upload.array("photo"), photoController.uploadPhotos);

// GET 某个行程的所有照片
// GET 某个行程的所有公开照片 + 自己上传的私密照片
router.get("/trip/:tripId", photoController.getPhotosByTripFiltered);


// GET 某个行程某一天的照片（可选扩展）
router.get("/trip/:tripId/day/:dayIndex", photoController.getPhotosByTripAndDay);

// POST 点赞某张照片
router.post("/:photoId/like", photoController.likePhoto);

// DELETE 取消点赞某张照片
router.delete("/:photoId/like", photoController.unlikePhoto);

// GET 获取某张照片的点赞信息（数量 & 是否点赞）
router.get("/:photoId/likes", photoController.getPhotoLikes);

// POST 添加评论
router.post("/:photoId/comments", photoController.addComment);

// GET 获取某张照片的所有评论
router.get("/:photoId/comments", photoController.getComments);

// DELETE 删除评论（如果需要）
router.delete("/comment/:commentId", photoController.deleteComment);

module.exports = router;
