const maxQuantity = 2147483647;
const unitCostPattern = /^(?:\d{1,10}(?:\.\d{0,2})?|\.\d{1,2})$/;

function wholeNumber(value, min, max = maxQuantity) {
  const text = String(value ?? "");
  return /^\d+$/.test(text) && Number(text) >= min && Number(text) <= max;
}

export function purchaseOrderErrors(form, suppliers, products) {
  const errors = {};
  if (!suppliers.some(({ id }) => String(id) === form.supplierId)) {
    errors["purchase-supplier"] = suppliers.length
      ? "Select the supplier for this order."
      : "Add a supplier in Products, then return to this form.";
  }
  if (form.expectedDate) {
    const date = new Date(`${form.expectedDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expectedDate) || Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() < 1000 || date.toISOString().slice(0, 10) !== form.expectedDate) {
      errors["purchase-date"] = "Choose a valid date or leave it blank.";
    }
  }
  const selected = new Map();
  for (const [index, item] of form.items.entries()) {
    const { productId, orderedQuantity, unitCost } = item;
    if (!products.some(({ id }) => String(id) === productId)) {
      errors[`purchase-product-${index}`] = products.length
        ? "Select a product to order."
        : "Add a product in Products, then return to this form.";
    } else if (selected.has(productId)) {
      const first = selected.get(productId);
      errors[`purchase-product-${index}`] = `This product is already on line ${first + 1}. Add its quantity there or choose a different product.`;
    } else {
      selected.set(productId, index);
    }
    if (!wholeNumber(orderedQuantity, 1)) {
      errors[`purchase-quantity-${index}`] = orderedQuantity === ""
        ? "Enter how many units to order."
        : "Enter a whole number of at least 1, such as 5.";
    }
    if (!unitCostPattern.test(unitCost)) {
      errors[`purchase-cost-${index}`] = unitCost === ""
        ? "Enter the supplier’s price for one unit."
        : "Enter a price in pesos with up to two decimal places, such as 150.00.";
    }
  }
  return errors;
}

export function deliveryErrors(items, values) {
  const errors = {};
  let received = 0;
  for (const item of items) {
    const value = values.find(({ itemId }) => itemId === item.id);
    if (!value) continue;
    const good = value.goodQuantity === "" ? 0 : value.goodQuantity;
    const damaged = value.damagedQuantity === "" ? 0 : value.damagedQuantity;
    const due = item.missingQuantity;
    if (!wholeNumber(good, 0, due)) {
      errors[`delivery-good-${item.id}`] = `Enter a whole number from 0 to ${due}.`;
    }
    if (!wholeNumber(damaged, 0, due)) {
      errors[`delivery-damaged-${item.id}`] = `Enter a whole number from 0 to ${due}.`;
    }
    if (wholeNumber(good, 0, due) && wholeNumber(damaged, 0, due) && Number(good) + Number(damaged) > due) {
      errors[`delivery-damaged-${item.id}`] = `Good and damaged units together can’t exceed the ${due} still due.`;
    }
    received += Number(good) + Number(damaged);
  }
  if (!Object.keys(errors).length && received === 0 && items.length) {
    errors[`delivery-good-${items[0].id}`] = "Enter the good or damaged units that arrived for at least one product.";
  }
  return errors;
}

export function noteErrors(note) {
  const errors = {};
  if (note.quantity !== "" && !wholeNumber(note.quantity, 0)) {
    errors["restock-note-quantity"] = "Enter a whole number of 0 or more, or leave it blank.";
  }
  if (!note.details.trim()) {
    errors["restock-note-details"] = "Write a short note about what happened.";
  }
  return errors;
}
