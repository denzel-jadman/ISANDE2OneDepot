import { createHash } from "node:crypto";
import express from "express";
import { db } from "./db.js";
import { integer, optionalText, problem, requiredText } from "./inventory.js";

const receivableStatuses = ["SENT", "PARTIAL"];
const productSummary = { id: true, sku: true, name: true };
const orderDetails = {
  supplier: { select: { name: true, email: true, phone: true } },
  items: { include: { product: { select: productSummary } }, orderBy: { id: "asc" } },
  receipts: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      createdAt: true,
      items: {
        orderBy: { id: "asc" },
        select: { id: true, purchaseOrderItemId: true, goodQuantity: true, damagedQuantity: true, inspectionNote: true },
      },
    },
  },
};
const noteDetails = {
  product: { select: productSummary },
  purchaseOrder: { select: { id: true } },
};

function numberField(value, label, minimum = 0) {
  const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return integer(parsed, label, minimum);
}

function orderNumber(id) {
  return `PO-${String(id).padStart(4, "0")}`;
}

function orderView({ supplier, items, ...order }) {
  return {
    ...order,
    poNumber: orderNumber(order.id),
    supplierName: supplier.name,
    supplierEmail: supplier.email,
    supplierPhone: supplier.phone,
    items: items.map((item) => ({
      ...item,
      missingQuantity: item.orderedQuantity - item.receivedQuantity - item.damagedQuantity,
    })),
  };
}

async function getOrder(client, id) {
  const order = await client.purchaseOrder.findUnique({ where: { id }, include: orderDetails });
  if (!order) throw problem(404, "Purchase order not found.");
  return order;
}

function orderLines(items, validate) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    throw problem(400, "Enter 1 to 50 order lines.");
  }
  return items.map((item) => validate(item ?? {}));
}

function assertUnique(items, field) {
  if (new Set(items.map((item) => item[field])).size !== items.length) {
    throw problem(400, "Each product can appear only once.");
  }
}

function expectedDelivery(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date.getUTCFullYear() >= 1000) {
      return date;
    }
  }
  throw problem(400, "Enter a valid expected delivery date.");
}

function draftItem(item) {
  const unitCost = String(item.unitCost ?? "");
  if (!/^(?:\d{1,10}(?:\.\d{0,2})?|\.\d{1,2})$/.test(unitCost)) {
    throw problem(400, "Unit cost must be nonnegative and have at most two decimal places.");
  }
  return {
    productId: numberField(item.productId, "Product", 1),
    orderedQuantity: numberField(item.orderedQuantity, "Ordered quantity", 1),
    unitCost,
  };
}

function receiptItem(item) {
  return {
    itemId: numberField(item.itemId, "Order item", 1),
    goodQuantity: numberField(item.goodQuantity === "" ? 0 : item.goodQuantity, "Good quantity"),
    damagedQuantity: numberField(item.damagedQuantity === "" ? 0 : item.damagedQuantity, "Damaged quantity"),
    inspectionNote: optionalText(item.inspectionNote, "Inspection note", 1000),
  };
}

function noteView(note) {
  return {
    ...note,
    purchaseOrder: note.purchaseOrder ? { poNumber: orderNumber(note.purchaseOrder.id) } : null,
  };
}

export const restocking = express.Router();

restocking.get("/purchase-orders", async (_req, res) => {
  const orders = await db.purchaseOrder.findMany({ include: orderDetails, orderBy: { id: "desc" } });
  res.json(orders.map(orderView));
});

restocking.post("/purchase-orders", async (req, res) => {
  const { supplierId, expectedDate, remarks, items } = req.body ?? {};
  const lines = orderLines(items, draftItem);
  assertUnique(lines, "productId");
  const data = {
    supplierId: numberField(supplierId, "Supplier", 1),
    expectedDate: expectedDelivery(expectedDate),
    remarks: optionalText(remarks, "Remarks", 1000),
  };

  const order = await db.$transaction(async (tx) => {
    const [supplier, products] = await Promise.all([
      tx.supplier.findUnique({ where: { id: data.supplierId }, select: { id: true } }),
      tx.product.count({ where: { id: { in: lines.map((item) => item.productId) }, archivedAt: null } }),
    ]);
    if (!supplier) throw problem(400, "Select an existing supplier.");
    if (products !== lines.length) throw problem(400, "Select active products for every line.");
    return tx.purchaseOrder.create({
      data: { ...data, items: { create: lines } },
      include: orderDetails,
    });
  });
  res.status(201).json(orderView(order));
});

restocking.patch("/purchase-orders/:id/send", async (req, res) => {
  const id = numberField(req.params.id, "Purchase order", 1);
  const update = await db.purchaseOrder.updateMany({
    where: { id, status: "DRAFT" },
    data: { status: "SENT", sentAt: new Date(), version: { increment: 1 } },
  });
  const order = await getOrder(db, id);
  if (!update.count && order.status !== "SENT") throw problem(409, "Only draft purchase orders can be marked as sent.");
  res.json(orderView(order));
});

async function replayReceipt(requestId, purchaseOrderId, requestHash) {
  const previous = await db.restockReceipt.findUnique({ where: { requestId } });
  if (!previous) return null;
  if (previous.purchaseOrderId !== purchaseOrderId || previous.requestHash !== requestHash) {
    throw problem(409, "This receipt ID has already been used for a different delivery.");
  }
  return orderView(await getOrder(db, purchaseOrderId));
}

async function saveReceipt(tx, id, version, requestId, requestHash, lines) {
  const update = await tx.purchaseOrder.updateMany({
    where: { id, version, status: { in: receivableStatuses } },
    data: { version: { increment: 1 } },
  });
  if (!update.count) {
    if (!await tx.purchaseOrder.findUnique({ where: { id }, select: { id: true } })) {
      throw problem(404, "Purchase order not found.");
    }
    throw problem(409, "This order has changed. Reopen the delivery form to see what is still due.", "ORDER_CHANGED");
  }
  const order = await getOrder(tx, id);
  const byItem = new Map(order.items.map((item) => [item.id, item]));
  const checked = lines.map((line) => {
    const item = byItem.get(line.itemId);
    if (!item) throw problem(400, "A line does not belong to this purchase order.");
    const due = item.orderedQuantity - item.receivedQuantity - item.damagedQuantity;
    if (line.goodQuantity + line.damagedQuantity > due) {
      throw problem(400, `Good and damaged units exceed the quantity still due for ${item.product.sku}.`);
    }
    return { ...line, item };
  });
  // Lock shared product rows in the same order across deliveries.
  checked.sort((a, b) => a.item.productId - b.item.productId);
  const receipt = await tx.restockReceipt.create({ data: { purchaseOrderId: id, requestId, requestHash } });

  for (const { item, goodQuantity, damagedQuantity, inspectionNote } of checked) {
    if (!goodQuantity && !damagedQuantity && !inspectionNote) continue;
    const line = await tx.restockReceiptItem.create({
      data: { receiptId: receipt.id, purchaseOrderItemId: item.id, goodQuantity, damagedQuantity, inspectionNote },
    });

    if (goodQuantity) {
      const product = await tx.product.update({
        where: { id: item.productId, archivedAt: null, quantity: { lte: 2147483647 - goodQuantity } },
        data: { quantity: { increment: goodQuantity }, version: { increment: 1 } },
        select: { quantity: true },
      }).catch((error) => {
        if (error.code === "P2025") throw problem(409, `Stock could not be added for ${item.product.sku}. Check its quantity and archive status.`);
        throw error;
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId, kind: "RESTOCK", delta: goodQuantity,
          quantityAfter: product.quantity, receiptItemId: line.id,
        },
      });
    }

    if (goodQuantity || damagedQuantity) {
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQuantity: { increment: goodQuantity }, damagedQuantity: { increment: damagedQuantity } },
      });
      item.receivedQuantity += goodQuantity;
      item.damagedQuantity += damagedQuantity;
    }
  }

  const complete = order.items.every((item) => item.receivedQuantity + item.damagedQuantity === item.orderedQuantity);
  const hasDamage = order.items.some((item) => item.damagedQuantity > 0);
  const status = complete ? (hasDamage ? "RECEIVED_WITH_ISSUES" : "RECEIVED") : "PARTIAL";
  return tx.purchaseOrder.update({
    where: { id },
    data: { status, receivedAt: receipt.createdAt },
    include: orderDetails,
  });
}

restocking.patch("/purchase-orders/:id/receive", async (req, res) => {
  const id = numberField(req.params.id, "Purchase order", 1);
  const { version, requestId, items } = req.body ?? {};
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(requestId)) {
    throw problem(400, "A delivery request ID is required.");
  }
  const orderVersion = numberField(version, "Order version");
  const lines = orderLines(items, receiptItem).sort((a, b) => a.itemId - b.itemId);
  assertUnique(lines, "itemId");
  if (!lines.some((line) => line.goodQuantity || line.damagedQuantity)) {
    throw problem(400, "Enter at least one good or damaged unit received.");
  }
  const hash = createHash("sha256").update(JSON.stringify(lines)).digest("hex");
  const previous = await replayReceipt(requestId, id, hash);
  if (previous) return res.json(previous);

  try {
    const order = await db.$transaction((tx) => saveReceipt(tx, id, orderVersion, requestId, hash, lines), { timeout: 15000 });
    return res.json(orderView(order));
  } catch (error) {
    if (["ORDER_CHANGED", "P2002", "P2034"].includes(error.code)) {
      const saved = await replayReceipt(requestId, id, hash);
      if (saved) return res.json(saved);
      if (error.code === "P2034") throw problem(409, "A stock update was in progress. Retry this receipt.");
    }
    throw error;
  }
});

restocking.get("/restock-notes", async (_req, res) => {
  const [manual, inspection] = await Promise.all([
    db.restockNote.findMany({ include: noteDetails }),
    db.restockReceiptItem.findMany({
      where: { OR: [{ damagedQuantity: { gt: 0 } }, { inspectionNote: { not: null } }] },
      include: {
        receipt: { select: { createdAt: true, purchaseOrderId: true } },
        purchaseOrderItem: { include: { product: { select: productSummary } } },
      },
    }),
  ]);
  const notes = inspection.map((item) => ({
    id: `receipt-${item.id}`,
    type: item.damagedQuantity ? "DAMAGED" : "GENERAL",
    quantity: item.damagedQuantity,
    details: item.inspectionNote ?? `${item.damagedQuantity} damaged unit(s) were recorded during receiving.`,
    product: item.purchaseOrderItem.product,
    purchaseOrder: { poNumber: orderNumber(item.receipt.purchaseOrderId) },
    createdAt: item.receipt.createdAt,
  }));
  res.json([...manual.map(noteView), ...notes].sort((a, b) => b.createdAt - a.createdAt));
});

restocking.post("/restock-notes", async (req, res) => {
  const { purchaseOrderId, productId, type, quantity, details } = req.body ?? {};
  if (!["GENERAL", "MISSING", "DAMAGED"].includes(type)) throw problem(400, "Select a valid note type.");
  const data = {
    purchaseOrderId: purchaseOrderId ? numberField(purchaseOrderId, "Purchase order", 1) : null,
    productId: productId ? numberField(productId, "Product", 1) : null,
    type,
    quantity: numberField(quantity === "" ? 0 : quantity, "Affected quantity"),
    details: requiredText(details, "Details", 1000),
  };
  const note = await db.restockNote.create({ data, include: noteDetails }).catch((error) => {
    if (error.code === "P2003") throw problem(400, "Select an existing purchase order or product.");
    throw error;
  });
  res.status(201).json(noteView(note));
});
