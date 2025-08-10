// routes/debug.js
const router = require("express").Router();
const { sendToQueue } = require("../utils/rabbitmq");

router.post("/debug/ping-notify", async (req, res) => {
  const { userId, message = "test" } = req.body || {};
  try {
    await sendToQueue({
      type: "test",
      userId: Number(userId),
      tripId: null,
      message,
      timestamp: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

module.exports = router;
