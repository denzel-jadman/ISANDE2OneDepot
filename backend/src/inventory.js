export function problem(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

export function requiredText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw problem(400, `${label} must contain 1 to ${maxLength} characters.`);
  }
  return value.trim();
}

export function optionalText(value, label, maxLength) {
  return value == null || value === "" ? null : requiredText(value, label, maxLength);
}

export function integer(value, label, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum || value > 2147483647) {
    throw problem(400, `${label} must be a whole number of at least ${minimum}.`);
  }
  return value;
}

export function productInput(input) {
  const { sku, name, category, price, quantity, lowStockAt, supplierId, photoPath } = input ?? {};
  if (!["number", "string"].includes(typeof price) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(price))) {
    throw problem(400, "Price must be nonnegative and have at most two decimal places.");
  }
  const photo = optionalText(photoPath, "Photo path", 255);
  if (photo && !/^\/product-photos\/(?:[\w-]+\/)*[\w-]+\.(?:jpe?g|png|webp)$/i.test(photo)) {
    throw problem(400, "Photo must be a JPG, PNG, or WebP path under /product-photos/.");
  }
  return {
    sku: requiredText(sku, "SKU", 64),
    name: requiredText(name, "Product name", 160),
    category: optionalText(category, "Category", 120),
    price: String(price),
    quantity: integer(quantity, "Quantity"),
    lowStockAt: integer(lowStockAt, "Low-stock threshold"),
    supplierId: supplierId == null ? null : integer(supplierId, "Supplier", 1),
    ...(photoPath === undefined ? {} : { photoPath: photo }),
  };
}

export function supplierInput(input) {
  const { name, email, phone } = input ?? {};
  return {
    name: requiredText(name, "Supplier name", 160),
    email: optionalText(email, "Email", 254),
    phone: optionalText(phone, "Phone", 40),
  };
}

export function createProduct(db, data) {
  return db.product.create({
    data: {
      ...data,
      movements: data.quantity > 0
        ? { create: { kind: "OPENING", delta: data.quantity, quantityAfter: data.quantity } }
        : undefined,
    },
  });
}
