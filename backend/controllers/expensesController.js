const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

/** 获取某个行程的所有费用项 */
exports.getExpensesByTripId = async (tripId) => {
  const tid = Number(tripId);
  return prisma.expense.findMany({
    where: { tripId: tid },
    include: {
      payer: true,   // 确保 schema 里 Expense 有 payer 关系字段
      splits: true,  // 确保有 splits[]
    },
    orderBy: { id: "asc" },
  });
};

/** 批量保存费用（全量覆盖）：先删旧的，再写新的 */
exports.saveExpenses = async (tripId, expenses = []) => {
  const tid = Number(tripId);

  // 仅保留填写完整的行，避免非法值写库
  const clean = (expenses || [])
    .map(e => ({
      note: String(e.note || "").trim(),
      amount: Number(e.amount),
      payerId: Number(e.payerId),
    }))
    .filter(e => e.note && Number.isFinite(e.amount) && e.amount > 0 && Number.isInteger(e.payerId) && e.payerId > 0);

  await prisma.$transaction(async (tx) => {
    // 先删从表 Split，再删主表 Expense（避免外键约束）
    await tx.split.deleteMany({ where: { tripId: tid } });
    await tx.expense.deleteMany({ where: { tripId: tid } });

    if (!clean.length) return;

    // 批量插入（无 splits，这里只保存主记录）
    await tx.expense.createMany({
      data: clean.map(e => ({
        tripId: tid,
        payerId: e.payerId,
        amount: e.amount,
        note: e.note,
      })),
    });
  });
};

/** 删除单条费用（会连带删除其 splits） */
exports.deleteExpense = async (expenseId) => {
  const id = Number(expenseId);
  await prisma.$transaction(async (tx) => {
    await tx.split.deleteMany({ where: { expenseId: id } });
    await tx.expense.delete({ where: { id } });
  });
};

/** 按行程清空所有费用（可用于一键清空） */
exports.deleteExpensesByTrip = async (tripId) => {
  const tid = Number(tripId);
  await prisma.$transaction(async (tx) => {
    // 如果 Split 没有 tripId 字段，可改成 { where: { expense: { tripId: tid } } }
    await tx.split.deleteMany({ where: { tripId: tid } });
    await tx.expense.deleteMany({ where: { tripId: tid } });
  });
};
