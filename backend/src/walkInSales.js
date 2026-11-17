import { createHash } from "node:crypto";
import { db } from "./db.js";
import { integer, problem } from "./inventory.js";

const include = { items: { orderBy: { id: "asc" } } };
const pageSize = 20;

function saleSummary({ id, createdAt, items }) {
  return { id, createdAt, reference: `SALE-${String(id).padStart(4, "0")}`, items };
}

export async function listWalkInSales(req, res) {
  const before = req.query.before === undefined ? undefined : integer(Number(req.query.before), "Sale", 1);
  const rows = await db.walkInSale.findMany({
    where: before === undefined ? {} : { id: { lt: before } },
    orderBy: { id: "desc" }, take: pageSize + 1, include,
  });
  res.json({ sales: rows.slice(0, pageSize).map(saleSummary), next: rows.length > pageSize ? rows[pageSize - 1].id : null });
}

export async function recordWalkInSale(req, res) {
  const { requestId, items } = req.body ?? {};
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(requestId)) {
    throw problem(400, "The sale reference is missing. Start a new sale and try again.");
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    throw problem(400, "Add between 1 and 50 different products.");
  }
  const lines = items.map((item) => {
    const { productId, quantity, price } = item ?? {};
    if (typeof price !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(price)) {
      throw problem(400, "Check the product prices before recording this sale.");
    }
    return { productId: integer(productId, "Product", 1), quantity: integer(quantity, "Quantity", 1), price };
  }).sort((a, b) => a.productId - b.productId);
  if (new Set(lines.map(({ productId }) => productId)).size !== lines.length) {
    throw problem(400, "Combine quantities for the same product.");
  }
  const requestHash = createHash("sha256").update(JSON.stringify(lines)).digest("hex");

  try {
    const sale = await db.$transaction(async (tx) => {
      const sale = await tx.walkInSale.create({ data: { requestId, requestHash } });
      const savedItems = [];
      for (const { productId, quantity, price } of lines) {
        const updated = await tx.product.updateMany({
          where: { id: productId, archivedAt: null, quantity: { gte: quantity }, price },
          data: { quantity: { decrement: quantity }, version: { increment: 1 } },
        });
        if (!updated.count) {
          const product = await tx.product.findUnique({
            where: { id: productId },
            select: { sku: true, name: true },
          });
          const message = product
            ? `Check the stock and price for ${product.name} (${product.sku}) before recording this sale.`
            : "A product is unavailable. Refresh stock and review the sale.";
          throw problem(409, message, "SALE_CHANGED");
        }
        const current = await tx.product.findUniqueOrThrow({
          where: { id: productId }, select: { name: true, sku: true, price: true, quantity: true },
        });
        const saved = await tx.walkInSaleItem.create({
          data: {
            saleId: sale.id, productId, name: current.name, sku: current.sku, price: current.price, quantity,
            movement: { create: { productId, kind: "WALK_IN_SALE", delta: -quantity, quantityAfter: current.quantity } },
          },
        });
        savedItems.push(saved);
      }
      return { ...sale, items: savedItems };
    }, { timeout: 15000 });
    res.status(201).json(saleSummary(sale));
  } catch (error) {
    if (error.code === "P2002") {
      const saved = await db.walkInSale.findUnique({ where: { requestId }, include });
      if (saved?.requestHash === requestHash) return res.json(saleSummary(saved));
      if (saved) throw problem(409, "This sale reference is already used. Open Sales history to check the saved sale.");
    }
    if (error.code === "P2034") throw problem(409, "Stock is being updated. Try recording the same sale again.");
    throw error;
  }
}
