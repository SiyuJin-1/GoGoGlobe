const express = require("express");
const router = express.Router();
const controller = require("../controllers/expensesController");

// 获取费用
router.get("/", async (req, res) => {
  const { tripId } = req.query;
  if (!tripId) return res.status(400).json({ error: "tripId is required" });

  try {
    const expenses = await controller.getExpensesByTripId(Number(tripId));
    res.json(expenses);
  } catch (err) {
    console.error("/expenses error:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// 保存费用（批量）
router.post("/save", async (req, res) => {
  const { tripId, expenses } = req.body;
  try {
    await controller.saveExpenses(tripId, expenses);
    res.json({ message: "保存成功" });
  } catch (error) {
    console.error("POST /expenses/save error:", error);
    res.status(500).json({ error: "保存失败" });
  }
});

/* ========== 新增：删除接口 ========== */

// 删除单条费用
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "invalid expense id" });
  }
  try {
    await controller.deleteExpense(id);
    return res.status(204).end(); // No Content
  } catch (err) {
    console.error("DELETE /expenses/:id error:", err);
    return res.status(500).json({ error: "删除失败" });
  }
});

// （可选）按 trip 一键清空该行程的全部费用
router.delete("/trip/:tripId", async (req, res) => {
  const tripId = Number(req.params.tripId);
  if (!Number.isInteger(tripId) || tripId <= 0) {
    return res.status(400).json({ error: "invalid trip id" });
  }
  try {
    await controller.deleteExpensesByTrip(tripId);
    return res.status(204).end();
  } catch (err) {
    console.error("DELETE /expenses/trip/:tripId error:", err);
    return res.status(500).json({ error: "清空失败" });
  }
});

module.exports = router;
