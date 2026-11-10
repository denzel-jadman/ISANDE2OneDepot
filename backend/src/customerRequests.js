import { createHash } from "node:crypto";
import { db } from "./db.js";
import { integer, optionalText, problem, requiredText } from "./inventory.js";

const items = { orderBy: { id: "asc" } };
const orderState = { reviewedAt: true, confirmedAt: true, completedAt: true };
const paymentState = {
  deliveryFee: true, demoPayment: true, proofSubmittedAt: true, proofNeedsReplacement: true,
};
const checkoutKey = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const maxProofBytes = 2 * 1024 * 1024;

function paymentSettings() {
  const { CHECKOUT_GCASH_NAME: name, CHECKOUT_GCASH_NUMBER: number, CHECKOUT_DELIVERY_FEE: fee } = process.env;
  if (!name && !number && !fee) return { demo: true, fee: "120.00" };
  if (!name?.trim() || !/^09\d{9}$/.test(number ?? "") || !/^\d{1,8}(\.\d{1,2})?$/.test(fee ?? "")) {
    throw problem(503, "Checkout payment details are being updated. Please contact the shop.");
  }
  return { demo: false, name: name.trim(), number, fee };
}

function reference(id) {
  return `REQ-${String(id).padStart(4, "0")}`;
}

function parseRequest(body, checkout) {
  const { requestId, name, phone, note, items: requested } = body ?? {};
  if (typeof requestId !== "string" || !checkoutKey.test(requestId)) {
    throw problem(400, "The request ID is missing. Open your cart again and try once more.");
  }
  if (!Array.isArray(requested) || !requested.length || requested.length > 50) {
    throw problem(400, "Include 1 to 50 different products per request.");
  }
  const phoneNumber = requiredText(phone, "Contact number", 40);
  const digits = phoneNumber.replace(/\D/g, "");
  if (!/^\+?[\d\s()-]+$/.test(phoneNumber) || digits.length < 7 || digits.length > 15) {
    throw problem(400, "Enter a valid phone number so the shop can contact you.");
  }

  const lines = requested.map((item) => {
    const { productId, quantity, price } = item ?? {};
    if (typeof price !== "string" || !/^\d{1,10}(\.\d{1,2})?$/.test(price)) {
      throw problem(400, "Open your cart again to check current prices.");
    }
    return { productId: integer(productId, "Product", 1), quantity: integer(quantity, "Quantity", 1), price };
  }).sort((a, b) => a.productId - b.productId);
  if (new Set(lines.map((item) => item.productId)).size !== lines.length) {
    throw problem(400, "Include each product only once.");
  }
  const contact = { name: requiredText(name, "Name", 160), phone: phoneNumber, note: optionalText(note, "Note", 1000) };
  if (checkout) contact.deliveryAddress = requiredText(body.deliveryAddress, "Delivery address", 500);
  const requestHash = createHash("sha256").update(JSON.stringify({ contact, lines })).digest("hex");
  return { requestId, requestHash, contact, lines };
}

async function existingRequest(requestId, requestHash) {
  const order = await db.customerOrderRequest.findUnique({
    where: { requestId },
    select: { id: true, requestHash: true },
  });
  if (order && order.requestHash !== requestHash) {
    throw problem(409, "This request number is already in use. Review your cart and try again.");
  }
  return order;
}

async function saveCustomerRequest(req, res, checkout) {
  const { requestId, requestHash, contact, lines } = parseRequest(req.body, checkout);
  const previous = await existingRequest(requestId, requestHash);
  if (previous) return res.json({ reference: reference(previous.id) });
  const settings = checkout ? paymentSettings() : null;
  if (settings && req.body.deliveryFee !== settings.fee) {
    throw problem(409, "The delivery fee changed. Check the updated total before continuing.", "FEE_CHANGED");
  }

  try {
    const order = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: lines.map(({ productId }) => productId) }, archivedAt: null },
        select: { id: true, sku: true, name: true, price: true, quantity: true },
      });
      const byId = new Map(products.map((product) => [product.id, product]));
      const snapshots = lines.map(({ productId, quantity, price }) => {
        const product = byId.get(productId);
        if (!product || product.quantity < quantity || !product.price.equals(price)) {
          throw problem(409, "Stock or prices changed. Review the updated cart and send your request again.", "CART_CHANGED");
        }
        return { productId, sku: product.sku, name: product.name, price: product.price, quantity };
      });
      return tx.customerOrderRequest.create({
        data: {
          ...contact, requestId, requestHash, items: { create: snapshots },
          ...(settings && { deliveryFee: settings.fee, demoPayment: settings.demo }),
        },
        select: { id: true },
      });
    });
    return res.status(201).json({ reference: reference(order.id) });
  } catch (error) {
    if (error.code === "P2002") {
      const replay = await existingRequest(requestId, requestHash);
      if (replay) return res.json({ reference: reference(replay.id) });
    }
    throw error;
  }
}

export function submitCustomerRequest(req, res) {
  return saveCustomerRequest(req, res, false);
}

export function startCustomerCheckout(req, res) {
  return saveCustomerRequest(req, res, true);
}

export function checkoutSettings(_req, res) {
  const { demo, fee } = paymentSettings();
  res.json({ demo, fee });
}

function getCheckoutKey(req) {
  const key = req.get("X-Order-Key");
  if (!checkoutKey.test(key ?? "")) throw problem(404, "This order link is missing or invalid.");
  return key;
}

function receiptVersion(req) {
  const submittedAt = req.body?.proofSubmittedAt;
  if (typeof submittedAt !== "string") return null;
  const date = new Date(submittedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function customerOrderStatus(req, res) {
  const requestId = getCheckoutKey(req);
  const order = await db.customerOrderRequest.findUnique({
    where: { requestId, deliveryAddress: { not: null } },
    select: { id: true, ...orderState, ...paymentState, items: { select: { id: true, name: true, price: true, quantity: true } } },
  });
  if (!order) throw problem(404, "This order link is missing or invalid.");
  let payment;
  if (!order.confirmedAt && !order.demoPayment && !order.proofSubmittedAt) {
    const { name, number } = paymentSettings();
    if (number) payment = { name, number };
  }
  res.json({ ...order, reference: reference(order.id), payment });
}

export async function submitPaymentProof(req, res) {
  const requestId = getCheckoutKey(req);
  const proof = req.body;
  const type = req.get("Content-Type");
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const jpeg = [0xff, 0xd8, 0xff];
  const signature = type === "image/png" ? png : jpeg;
  if (!Buffer.isBuffer(proof) || proof.length <= signature.length || proof.length > maxProofBytes
    || !["image/png", "image/jpeg"].includes(type)
    || !proof.subarray(0, signature.length).equals(Buffer.from(signature))) {
    throw problem(400, "Choose a JPG or PNG receipt image up to 2 MB.");
  }
  const result = await db.customerOrderRequest.updateMany({
    where: {
      requestId, deliveryAddress: { not: null }, confirmedAt: null,
      OR: [{ proofSubmittedAt: null }, { proofNeedsReplacement: true }],
    },
    data: {
      paymentProof: proof, paymentProofType: type, proofSubmittedAt: new Date(),
      proofNeedsReplacement: false, reviewedAt: null,
    },
  });
  if (!result.count) {
    const order = await db.customerOrderRequest.findUnique({
      where: { requestId, deliveryAddress: { not: null } },
      select: { paymentProof: true },
    });
    if (!order) throw problem(404, "This order link is missing or invalid.");
    if (!order.paymentProof || !Buffer.from(order.paymentProof).equals(proof)) {
      throw problem(409, "The shop already has a receipt. Refresh the order status before trying again.");
    }
  }
  res.sendStatus(204);
}

export async function ownerPaymentProof(req, res) {
  const id = integer(Number(req.params.id), "Request", 1);
  const order = await db.customerOrderRequest.findUnique({
    where: { id }, select: { paymentProof: true, paymentProofType: true },
  });
  if (!order?.paymentProof) throw problem(404, "No receipt is available for this order.");
  res.set("X-Content-Type-Options", "nosniff");
  res.type(order.paymentProofType).send(Buffer.from(order.paymentProof));
}

export async function requestReplacementProof(req, res) {
  const id = integer(Number(req.params.id), "Request", 1);
  const submittedAt = receiptVersion(req);
  if (!submittedAt) throw problem(409, "Refresh the order to see its current receipt.");
  const result = await db.customerOrderRequest.updateMany({
    where: { id, confirmedAt: null, proofSubmittedAt: submittedAt },
    data: { proofNeedsReplacement: true, reviewedAt: null },
  });
  if (!result.count) throw problem(409, "The order or receipt changed. Refresh the list to review it again.");
  res.json(await findOrderState(db, id));
}

export async function listCustomerRequests(_req, res) {
  const orders = await db.customerOrderRequest.findMany({
    where: { OR: [{ deliveryAddress: null }, { proofSubmittedAt: { not: null } }] },
    orderBy: { id: "desc" },
    select: { id: true, name: true, phone: true, note: true, createdAt: true, deliveryAddress: true, ...orderState, ...paymentState, items },
  });
  res.json(orders.map((order) => ({ ...order, reference: reference(order.id) })));
}

async function findOrderState(client, id) {
  const order = await client.customerOrderRequest.findUnique({ where: { id }, select: { ...orderState, ...paymentState } });
  if (!order) throw problem(404, "Order request not found.");
  return order;
}

export async function reviewCustomerRequest(req, res) {
  const id = integer(Number(req.params.id), "Request", 1);
  const submittedAt = receiptVersion(req);
  const result = await db.customerOrderRequest.updateMany({
    where: {
      id, reviewedAt: null, proofNeedsReplacement: false,
      OR: [{ deliveryAddress: null }, ...(submittedAt ? [{ proofSubmittedAt: submittedAt }] : [])],
    },
    data: { reviewedAt: new Date() },
  });
  const order = await findOrderState(db, id);
  if (!result.count && !order.reviewedAt) throw problem(409, "The receipt is missing or changed. Refresh the list before verifying it.");
  res.json(order);
}

export async function confirmCustomerRequest(req, res) {
  const id = integer(Number(req.params.id), "Request", 1);
  try {
    const state = await db.$transaction(async (tx) => {
      const claimed = await tx.customerOrderRequest.updateMany({
        where: { id, reviewedAt: { not: null }, confirmedAt: null, proofNeedsReplacement: false },
        data: { confirmedAt: new Date() },
      });
      const order = await findOrderState(tx, id);
      if (!order.reviewedAt) throw problem(409, "Review the request before confirming it.");
      if (claimed.count === 0) return order;

      // Lock products in the same order as supplier receipts.
      const lines = await tx.customerOrderRequestItem.findMany({
        where: { orderRequestId: id },
        orderBy: { productId: "asc" },
      });
      for (const line of lines) {
        const product = await tx.product.update({
          where: { id: line.productId, archivedAt: null, quantity: { gte: line.quantity } },
          data: { quantity: { decrement: line.quantity }, version: { increment: 1 } },
          select: { quantity: true },
        }).catch((error) => {
          if (error.code === "P2025") {
            throw problem(409, `Can’t confirm this order because ${line.name} is unavailable or has too little stock. Check Products and try again.`);
          }
          throw error;
        });
        await tx.stockMovement.create({
          data: {
            productId: line.productId, kind: "ORDER_CONFIRMED", delta: -line.quantity,
            quantityAfter: product.quantity, customerOrderItemId: line.id,
          },
        });
      }
      return order;
    }, { timeout: 15000 });
    res.json(state);
  } catch (error) {
    if (error.code === "P2034") {
      throw problem(409, "Another stock update was in progress. Try confirming again.");
    }
    throw error;
  }
}

export async function completeCustomerRequest(req, res) {
  const id = integer(Number(req.params.id), "Request", 1);
  await db.customerOrderRequest.updateMany({
    where: { id, confirmedAt: { not: null }, completedAt: null },
    data: { completedAt: new Date() },
  });
  const order = await findOrderState(db, id);
  if (!order.confirmedAt) throw problem(409, "Confirm the order before marking it as completed.");
  res.json(order);
}
