const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

exports.saveTrip = async (req, res) => {
  const { userId, fromCity, destination, startDate, endDate, schedule } = req.body;

  try {
    const newTrip = await prisma.trip.create({
      data: {
        userId: Number(userId),
        fromCity,                      // ✅ 新增：出发城市
        destination,                  // ✅ 新增：目的地
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schedule,
      },
    });

    res.json(newTrip);
  } catch (err) {
    console.error("❌ Failed to save trip:", err);
    res.status(500).json({ message: "Failed to save trip", error: err.message });
  }
};

exports.getTripsByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const trips = await prisma.trip.findMany({
      where: { userId: Number(userId) },
    });
    res.json(trips);
  } catch (err) {
    console.error("❌ Failed to fetch user trips:", err);
    res.status(500).json({ message: "Failed to fetch trips", error: err.message });
  }
};

exports.deleteTrip = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.trip.delete({
      where: { id: Number(id) },
    });
    res.json({ message: "Trip deleted" });
  } catch (err) {
    console.error("❌ 删除行程失败:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
};
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { userId, fromCity, destination, startDate, endDate, schedule } = req.body;

  try {
    const updatedTrip = await prisma.trip.update({
      where: { id: Number(id) },
      data: {
        userId: Number(userId),
        fromCity,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schedule,
      },
    });

    res.json(updatedTrip);
  } catch (err) {
    console.error("❌ Failed to update trip:", err);
    res.status(500).json({ message: "Failed to update trip", error: err.message });
  }
};

exports.getTripById = async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: Number(id) },
    });

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(trip);
  } catch (err) {
    console.error("❌ 获取行程失败:", err);
    res.status(500).json({ message: "服务器出错", error: err.message });
  }
};
