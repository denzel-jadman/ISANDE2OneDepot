import { db } from "../src/db.js";

try {
  await db.$transaction(async (tx) => {
    const supplier = await tx.supplier.upsert({
      where: { name: "Demo Supply Co." },
      update: {},
      create: { name: "Demo Supply Co." },
    });

    await tx.product.upsert({
      where: { sku: "DEMO-001" },
      update: {},
      create: {
        sku: "DEMO-001",
        name: "Demo Cleaning Cloth",
        category: "Storage & Carry",
        price: "150.00",
        quantity: 10,
        lowStockAt: 3,
        supplierId: supplier.id,
        movements: { create: { kind: "OPENING", delta: 10, quantityAfter: 10 } },
      },
    });
  });
} finally {
  await db.$disconnect();
}
