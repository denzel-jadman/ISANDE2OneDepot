import { db } from "./db.js";
import { problem } from "./inventory.js";

const dayMs = 86_400_000;

function manilaMidnight(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0, 4) < "1001") {
    throw problem(400, "Enter a valid start and end date.");
  }
  const utcDate = new Date(value + "T00:00:00Z");
  if (Number.isNaN(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== value) {
    throw problem(400, "Enter a valid start and end date.");
  }
  return new Date(value + "T00:00:00+08:00");
}

export async function dailySalesReport(req, res) {
  const start = manilaMidnight(req.query.from);
  const lastDay = manilaMidnight(req.query.to);
  const days = (lastDay - start) / dayMs + 1;
  if (days < 1 || days > 31) throw problem(400, "Choose a date range of 1 to 31 days.");
  const end = new Date(lastDay.getTime() + dayMs);

  const rows = await db.$queryRaw`
    SELECT DATE_FORMAT(DATE_ADD(s.createdAt, INTERVAL 8 HOUR), '%Y-%m-%d') AS day,
      'walkIn' AS channel, COUNT(DISTINCT s.id) AS transactions, SUM(i.price * i.quantity) AS amount
    FROM WalkInSale s
    JOIN WalkInSaleItem i ON i.saleId = s.id
    WHERE s.createdAt >= ${start} AND s.createdAt < ${end}
    GROUP BY day
    UNION ALL
    SELECT DATE_FORMAT(DATE_ADD(o.completedAt, INTERVAL 8 HOUR), '%Y-%m-%d') AS day,
      'online' AS channel, COUNT(DISTINCT o.id) AS transactions, SUM(i.price * i.quantity) AS amount
    FROM CustomerOrderRequest o
    JOIN CustomerOrderRequestItem i ON i.orderRequestId = o.id
    WHERE o.completedAt >= ${start} AND o.completedAt < ${end}
      AND o.confirmedAt IS NOT NULL AND o.demoPayment = false
    GROUP BY day
  `;
  const byDay = new Map();
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(start.getTime() + (offset + 1) * dayMs).toISOString().slice(0, 10);
    byDay.set(date, {
      date, walkIn: { transactions: 0, amount: "0.00" }, online: { transactions: 0, amount: "0.00" },
    });
  }
  for (const { day, channel, transactions, amount } of rows) {
    byDay.get(day)[channel] = { transactions: Number(transactions), amount: amount.toFixed(2) };
  }
  res.json({ days: [...byDay.values()] });
}
