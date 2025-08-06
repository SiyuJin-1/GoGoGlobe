const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/user/:id", notificationController.getNotificationsByUser);
router.patch("/:id/read", notificationController.markAsRead);
router.get("/user/:id/unread-count", notificationController.getUnreadCountByUser);
module.exports = router;
