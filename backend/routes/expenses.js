const express = require("express");
const router = express.Router();
const controller = require("../controllers/expensesController");

router.get("/", async (req, res) => {
  const { tripId } = req.query;
  if (!tripId) {
    return res.status(400).json({ error: "tripId is required" });
  }

  try {
    const expenses = await controller.getExpensesByTripId(Number(tripId));
    res.json(expenses);
  } catch (err) {
    console.error("/expenses error:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// 保存费用项
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

module.exports = router;
