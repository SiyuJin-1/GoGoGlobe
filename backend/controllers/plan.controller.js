const { generateItinerary } = require("../services/ai.service");

exports.generatePlan = async (req, res) => {
  const { fromCity, toCity, days, startDate, endDate, preferences } = req.body;

  try {
    const parsed = await generateItinerary({ fromCity, toCity, days, startDate, endDate, preferences });
    
    res.json(parsed); // ✅ 直接返回 { markdown, schedule }
  } catch (err) {
    console.error("❌ Controller error:", err);
    res.status(500).json({ message: "Failure of AI generation", error: err.message });
  }
};
