// routes/photos.js
const router = require("express").Router();
const ctrl = require("../controllers/photoController");

router.post("/", ctrl.createPhoto); // 前端直传 S3 后，落库
router.get("/trip/:tripId", ctrl.getPhotosByTripFiltered); // ?userId=&filter=
router.get("/:id/url", ctrl.getPhotoViewUrl); // 私有图取短期 URL
router.delete("/:id", ctrl.deletePhoto);

router.get("/:photoId/likes", ctrl.getPhotoLikes);
router.post("/:photoId/like", ctrl.likePhoto);
router.delete("/:photoId/like", ctrl.unlikePhoto);

router.get("/:photoId/comments", ctrl.getComments);
router.post("/:photoId/comments", ctrl.addComment);
router.delete("/comments/:commentId", ctrl.deleteComment);

module.exports = router;
