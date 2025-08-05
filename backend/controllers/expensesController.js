const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

// 获取某个行程的所有费用项
exports.getExpensesByTripId = async (tripId) => {
  return await prisma.expense.findMany({
    where: {
      tripId: Number(tripId), // 已经是 Number 类型
    },
    include: {
      payer: true,   // 包含付款人信息（要保证模型里有定义）
      splits: true   // 包含参与人分账信息
    }
  });
};

// 保存费用项
exports.saveExpenses = async (tripId, expenses) => {
  // 先删除旧的费用项
  await prisma.expense.deleteMany({
    where: { tripId: Number(tripId) }
  });

  // 再插入新费用项
  for (const item of expenses) {
  await prisma.expense.create({
    data: {
      tripId: Number(tripId),
      payerId: Number(item.payerId),
      amount: parseFloat(item.amount), // ✅ 把字符串转成 Float
      note: item.note || ""
    }
  });
}

};

