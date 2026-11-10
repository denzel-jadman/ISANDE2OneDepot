import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import express from "express";
import { db } from "./db.js";
import { createProduct, integer, problem, productInput, supplierInput } from "./inventory.js";
import { inventoryImport } from "./inventoryImport.js";
import { restocking } from "./restocking.js";
import {
  checkoutSettings, completeCustomerRequest, confirmCustomerRequest, customerOrderStatus,
  listCustomerRequests, ownerPaymentProof, requestReplacementProof, reviewCustomerRequest,
  startCustomerCheckout, submitCustomerRequest, submitPaymentProof,
} from "./customerRequests.js";

const { INVENTORY_OWNER_EMAIL, INVENTORY_OWNER_PASSWORD, INVENTORY_SESSION_SECRET } = process.env;
if (!INVENTORY_OWNER_EMAIL || !INVENTORY_OWNER_PASSWORD || INVENTORY_SESSION_SECRET?.length < 32 || !INVENTORY_SESSION_SECRET) {
  throw new Error("Configure the inventory login and a session secret of at least 32 characters in backend/.env.");
}

const app = express();
const api = express.Router();
const sessionCookie = "onedepot_inventory";
const sessionLifetime = 8 * 60 * 60 * 1000;
const cookieOptions = { httpOnly: true, sameSite: "strict", path: "/api/inventory" };

function matches(left, right) {
  const digest = (value) => createHash("sha256").update(value).digest();
  return typeof left === "string" && timingSafeEqual(digest(left), digest(right));
}

function sign(expiration) {
  return createHmac("sha256", INVENTORY_SESSION_SECRET).update(expiration).digest("hex");
}

app.disable("x-powered-by");
app.use("/api/inventory", api);
api.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
api.put("/checkout/proof", express.raw({ type: ["image/png", "image/jpeg"], limit: "2mb" }), submitPaymentProof);
api.use("/import", express.json({ limit: "2mb" }));
api.use(express.json({ limit: "16kb" }));

api.get("/catalog", async (_req, res) => {
  const products = await db.product.findMany({
    where: { archivedAt: null },
    select: { id: true, sku: true, name: true, category: true, price: true, quantity: true, photoPath: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  res.json(products);
});

api.post("/customer-requests", submitCustomerRequest);
api.get("/checkout/settings", checkoutSettings);
api.get("/checkout/status", customerOrderStatus);
api.post("/checkout", startCustomerCheckout);

api.post("/session", (req, res) => {
  const { email, password } = req.body ?? {};
  if (!matches(email, INVENTORY_OWNER_EMAIL) || !matches(password, INVENTORY_OWNER_PASSWORD)) {
    throw problem(401, "Invalid inventory email or password.");
  }

  const expiration = String(Date.now() + sessionLifetime);
  res.cookie(sessionCookie, `${expiration}.${sign(expiration)}`, { ...cookieOptions, maxAge: sessionLifetime });
  res.sendStatus(204);
});

api.delete("/session", (_req, res) => {
  res.clearCookie(sessionCookie, cookieOptions).sendStatus(204);
});

api.use((req, _res, next) => {
  const cookie = req.headers.cookie?.split("; ").find((entry) => entry.startsWith(`${sessionCookie}=`));
  const [expiration, signature] = cookie?.slice(sessionCookie.length + 1).split(".") ?? [];
  if (!/^\d+$/.test(expiration ?? "") || Number(expiration) <= Date.now() || !matches(signature, sign(expiration))) {
    throw problem(401, "Log in to manage inventory.");
  }
  next();
});

api.get("/session", (_req, res) => res.sendStatus(204));
api.get("/customer-requests", listCustomerRequests);
api.get("/customer-requests/:id/proof", ownerPaymentProof);
api.patch("/customer-requests/:id/request-proof", requestReplacementProof);
api.patch("/customer-requests/:id/review", reviewCustomerRequest);
api.patch("/customer-requests/:id/confirm", confirmCustomerRequest);
api.patch("/customer-requests/:id/complete", completeCustomerRequest);

api.get("/products", async (_req, res) => {
  res.json(await db.product.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }));
});

api.post("/products", async (req, res) => {
  res.status(201).json(await createProduct(db, productInput(req.body)));
});

api.patch("/products/:id", async (req, res) => {
  const id = integer(Number(req.params.id), "Product ID", 1);
  const data = productInput(req.body);
  const version = integer(req.body.version, "Product version");

  const product = await db.$transaction(async (tx) => {
    const previous = await tx.product.findUnique({ where: { id } });
    if (!previous || previous.archivedAt) throw problem(404, "Product not found.");
    if (previous.version !== version) throw problem(409, "This product changed. Reload the products and try again.", "PRODUCT_CHANGED");

    const result = await tx.product.updateMany({
      where: { id, version, archivedAt: null },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) throw problem(409, "This product changed. Reload the products and try again.", "PRODUCT_CHANGED");

    const delta = data.quantity - previous.quantity;
    if (delta !== 0) {
      await tx.stockMovement.create({
        data: { productId: id, kind: "ADJUSTMENT", delta, quantityAfter: data.quantity },
      });
    }
    return tx.product.findUniqueOrThrow({ where: { id } });
  });
  res.json(product);
});

api.delete("/products/:id", async (req, res) => {
  const id = integer(Number(req.params.id), "Product ID", 1);
  const result = await db.product.updateMany({
    where: { id, archivedAt: null },
    data: { archivedAt: new Date(), version: { increment: 1 } },
  });
  if (result.count === 0) throw problem(404, "Product not found.");
  res.sendStatus(204);
});

api.get("/products/:id/movements", async (req, res) => {
  const id = integer(Number(req.params.id), "Product ID", 1);
  res.json(await db.stockMovement.findMany({ where: { productId: id }, orderBy: { id: "asc" } }));
});

api.get("/suppliers", async (_req, res) => {
  res.json(await db.supplier.findMany({ orderBy: { name: "asc" } }));
});

api.post("/suppliers", async (req, res) => {
  res.status(201).json(await db.supplier.create({ data: supplierInput(req.body) }));
});

api.use("/import", inventoryImport);
api.use(restocking);

api.use((_req, _res, next) => next(problem(404, "Inventory endpoint not found.")));

app.use((error, req, res, _next) => {
  if (error.code === "P2002") return res.status(409).json({ error: "That SKU or supplier name already exists." });
  if (error.code === "P2003") return res.status(400).json({ error: "The selected supplier does not exist." });
  if (error.status === 400 && error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON request." });
  }
  if (error.status === 413 && req.path === "/api/inventory/checkout/proof") {
    return res.status(413).json({ error: "The upload is too large. Receipt images can be up to 2 MB." });
  }
  if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error(error);
  res.status(500).json({ error: "The inventory server could not complete the request." });
});

await db.$connect();
app.listen(3001, "127.0.0.1", () => console.log("OneDepot inventory API listening on http://127.0.0.1:3001"));
