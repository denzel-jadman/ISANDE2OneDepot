import express from "express";
import { parse } from "csv-parse/sync";
import { db } from "./db.js";
import { createProduct, optionalText, problem, productInput, supplierInput } from "./inventory.js";

const columns = {
  suppliers: ["name", "email", "phone"],
  inventory: ["sku", "name", "category", "price", "quantity", "lowStockAt", "supplier"],
};
const inventoryColumnsWithPhoto = [...columns.inventory, "photoPath"];
const maxFileBytes = 128 * 1024;
const maxRows = 250;
const identifiers = new Intl.Collator("en", { usage: "search", sensitivity: "base" });

function readCsv(file, csv, issues) {
  if (csv == null) return [];
  if (typeof csv !== "string" || Buffer.byteLength(csv) > maxFileBytes) {
    throw problem(400, "Each CSV file must be text and no larger than 128 KB.");
  }

  let records;
  try {
    records = parse(csv, { bom: true, trim: true, skip_empty_lines: true, relax_column_count: true });
  } catch (error) {
    issues.push({ file, row: Number.isInteger(error.records) ? error.records + 1 : null, message: "Malformed CSV. Check commas and quotation marks." });
    return [];
  }

  const [header, ...rows] = records;
  const hasPhoto = file === "inventory" && header?.length === inventoryColumnsWithPhoto.length;
  const expected = hasPhoto ? inventoryColumnsWithPhoto : columns[file];
  if (header?.length !== expected.length || expected.some((field, index) => field !== header[index])) {
    issues.push({ file, row: 1, message: `Use the downloaded ${file} template headers in order.` });
    return [];
  }
  if (rows.length > maxRows) throw problem(400, `Each file can contain up to ${maxRows} data rows.`);

  return rows.flatMap((values, index) => {
    const row = index + 2;
    if (values.length !== expected.length) {
      issues.push({ file, row, message: `Expected ${expected.length} columns and found ${values.length}.` });
      return [];
    }
    return [{ row, values: Object.fromEntries(expected.map((field, column) => [field, values[column].trim()])) }];
  });
}

function validatedRows(file, csv, issues, validate) {
  return readCsv(file, csv, issues).flatMap(({ row, values }) => {
    try {
      return [{ row, ...validate(values) }];
    } catch (error) {
      if (error.status !== 400) throw error;
      issues.push({ file, row, message: error.message });
      return [];
    }
  });
}

function wholeNumber(value) {
  return /^\d+$/.test(value) ? Number(value) : NaN;
}

function findName(rows, key, value) {
  return rows.find((row) => identifiers.compare(row.data[key], value) === 0);
}

async function checkDuplicates(rows, file, field, label, lookup, issues) {
  const seen = [];
  await Promise.all(rows.map(async (entry) => {
    const value = entry.data[field];
    const previous = findName(seen, field, value);
    if (previous) {
      issues.push({ file, row: entry.row, message: `${label} "${value}" also appears in row ${previous.row}.` });
      return;
    }

    seen.push(entry);
    if (await lookup(value)) {
      issues.push({ file, row: entry.row, message: `${label} "${value}" already exists in OneDepot.` });
    }
  }));
}

async function planImport(client, batch) {
  const issues = [];
  const suppliers = validatedRows("suppliers", batch?.suppliersCsv, issues, (values) => ({
    data: supplierInput(values),
  }));
  const products = validatedRows("inventory", batch?.inventoryCsv, issues, (values) => ({
    data: productInput({
      ...values,
      quantity: wholeNumber(values.quantity),
      lowStockAt: values.lowStockAt === "" ? 5 : wholeNumber(values.lowStockAt),
    }),
    supplier: optionalText(values.supplier, "Supplier name", 160),
  }));

  if (!suppliers.length && !products.length && !issues.length) {
    issues.push({ file: null, row: null, message: "Choose at least one CSV with data rows." });
  }
  await Promise.all([
    checkDuplicates(suppliers, "suppliers", "name", "Supplier", (name) => client.supplier.findFirst({
      where: { name }, select: { id: true },
    }), issues),
    checkDuplicates(products, "inventory", "sku", "SKU", (sku) => client.product.findFirst({
      where: { sku }, select: { id: true },
    }), issues),
    ...products.map(async (entry) => {
      if (!entry.supplier) return;
      const existing = await client.supplier.findFirst({
        where: { name: entry.supplier }, select: { id: true },
      });
      if (existing) {
        entry.data.supplierId = existing.id;
        return;
      }
      const incoming = findName(suppliers, "name", entry.supplier);
      if (incoming) {
        entry.incomingSupplier = incoming.data.name;
        return;
      }
      issues.push({
        file: "inventory", row: entry.row, message: `Supplier "${entry.supplier}" was not found.`,
      });
    }),
  ]);
  issues.sort((a, b) => (a.file ?? "").localeCompare(b.file ?? "") || a.row - b.row || a.message.localeCompare(b.message));
  return { suppliers, products, issues };
}

function preview(plan) {
  return {
    issues: plan.issues,
    suppliers: plan.suppliers.map(({ row, data }) => ({ row, ...data })),
    products: plan.products.map(({ row, data, supplier }) => ({ row, ...data, supplier })),
  };
}

export const inventoryImport = express.Router();

inventoryImport.get("/templates/:file", (req, res) => {
  const { file } = req.params;
  if (!Object.hasOwn(columns, file)) throw problem(404, "CSV template not found.");
  res.attachment(`onedepot-${file}-template.csv`).send(`${columns[file].join(",")}\r\n`);
});

inventoryImport.post("/preview", async (req, res) => {
  res.json(preview(await planImport(db, req.body)));
});

inventoryImport.post("/commit", async (req, res) => {
  const result = await db.$transaction(async (tx) => {
    const plan = await planImport(tx, req.body);
    if (plan.issues.length) return { preview: preview(plan) };

    const supplierIds = new Map();
    for (const { data } of plan.suppliers) {
      const supplier = await tx.supplier.create({ data });
      supplierIds.set(supplier.name, supplier.id);
    }
    for (const { data, incomingSupplier } of plan.products) {
      await createProduct(tx, {
        ...data,
        supplierId: incomingSupplier ? supplierIds.get(incomingSupplier) : data.supplierId,
      });
    }
    return { suppliers: plan.suppliers.length, products: plan.products.length };
  }, { timeout: 30000 });

  if (result.preview) return res.status(409).json({ error: "Resolve the listed issues before importing.", ...result.preview });
  res.status(201).json(result);
});
