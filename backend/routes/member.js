console.log("✅ member routes loaded");

const express = require("express");
const router = express.Router();
const {
  getMembersByTrip,
  addMember,
  updateMemberRole,
  deleteMember, // 👈 添加删除成员的控制器
} = require("../controllers/member.controller");

// 获取指定 trip 的所有成员
router.get("/", getMembersByTrip);

// 添加成员
router.post("/", addMember);

// 修改成员角色
router.put("/:id", updateMemberRole);

router.delete("/:id", deleteMember); // 👈 添加这行
module.exports = router;
