// backend/routes/accommodations.js
const router = require("express").Router();
const ctrl = require("../controllers/accommodationController");

// 旧：router.post("/", ctrl.uploadAccommodationImage, ctrl.createAccommodation);
// 新：
router.post("/", ctrl.createAccommodation);

router.get("/", ctrl.getAccommodationsByTrip);
router.patch("/:id", ctrl.updateAccommodation);   // ✅ 新增
router.put("/:id", ctrl.updateAccommodation); 
router.delete("/:id", ctrl.deleteAccommodation);
module.exports = router;
