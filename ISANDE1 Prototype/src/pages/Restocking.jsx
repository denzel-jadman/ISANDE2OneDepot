import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import InventoryNavbar from "../components/InventoryNavbar.jsx";
import { FieldError, FormErrorSummary, useRestockingForm } from "../components/RestockingFormFeedback.jsx";
import RestockNoteForm from "../components/RestockNoteForm.jsx";
import { deliveryErrors, purchaseOrderErrors } from "../restockingValidation.js";
import demoApi from "../api.js";
import { inventoryApi, inventoryMode } from "../inventoryApi.js";
import { categoryGroups } from "../constants/categories.js";

const api = inventoryMode ? inventoryApi : demoApi;
const labelClass = inventoryMode ? "text-sm font-medium text-gray-200" : "text-xs text-gray-400";
const inputText = inventoryMode ? "text-base" : "text-sm";
const maxNoteLength = inventoryMode ? 1000 : undefined;

const emptyPurchaseOrderItem = () => ({
  itemType: "EXISTING",
  productId: "",
  orderedQuantity: "",
  unitCost: "",
  newProduct: { sku: "", name: "", category: "", price: "", lowStockAt: "3" },
});

const emptyPurchaseOrder = {
  supplierId: "",
  supplierName: "",
  supplierEmail: "",
  supplierPhone: "",
  expectedDate: "",
  remarks: "",
  items: [emptyPurchaseOrderItem()],
};

const emptyNote = { purchaseOrderId: "", productId: "", type: "GENERAL", quantity: "", details: "" };

const statusDetails = {
  DRAFT: { label: "Draft", className: "bg-gray-700 text-gray-200" },
  SENT: { label: "Sent to supplier", className: "bg-amber/20 text-amber" },
  PARTIAL: { label: "Partially received", className: "bg-amber/20 text-amber" },
  RECEIVED: { label: "Received", className: "bg-olive/20 text-olive" },
  RECEIVED_WITH_ISSUES: { label: "Received with issues", className: "bg-warning/20 text-[#F6A59F]" },
};

const noteDetails = {
  GENERAL: { label: "General", className: "bg-gray-700 text-gray-200" },
  MISSING: { label: "Missing", className: "bg-amber/20 text-amber" },
  DAMAGED: { label: "Damaged", className: "bg-warning/20 text-[#F6A59F]" },
};

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function purchaseOrderTotal(purchaseOrder) {
  return purchaseOrder.items.reduce((sum, item) => sum + Number(item.orderedQuantity) * Number(item.unitCost), 0);
}

function PurchaseOrderForm({ products, suppliers, form, setForm, onSubmit, onCancel }) {
  const feedback = useRestockingForm(purchaseOrderErrors(form, suppliers, products), onSubmit, inventoryMode);

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  }

  function selectProduct(index, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index
        ? { ...item, itemType: value === "__new__" ? "NEW" : "EXISTING", productId: value === "__new__" ? "" : value }
        : item),
    }));
  }

  function updateNewProduct(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, newProduct: { ...item.newProduct, [field]: value } } : item),
    }));
  }

  function removeItem(index) {
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  const estimatedTotal = form.items.reduce((sum, item) => sum + (Number(item.orderedQuantity) || 0) * (Number(item.unitCost) || 0), 0);

  return (
    <form onSubmit={feedback.submit} noValidate={inventoryMode} aria-busy={feedback.saving}
      className="guided-form bg-panel border border-gray-700 rounded-card p-5 sm:p-6 mb-8">
      <fieldset disabled={feedback.saving} className="space-y-5 min-w-0">
      <div>
        <h2 className="font-heading text-xl mb-1">New purchase order</h2>
        <p className="text-sm text-gray-300">
          Choose a supplier, then enter the quantity and supplier cost for each product. Fields marked * are required.
        </p>
      </div>

      <FormErrorSummary errors={feedback.errors} />
      <div className="grid md:grid-cols-2 gap-4">
        {inventoryMode ? (
          <div>
            <label htmlFor="purchase-supplier" className={labelClass}>Supplier *</label>
            <select {...feedback.field("purchase-supplier")} required autoFocus value={form.supplierId}
              onChange={(event) => setForm({ ...form, supplierId: event.target.value })}
              className={`mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 ${inputText}`}>
              <option value="">Select a supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
            <FieldError errors={feedback.errors} id="purchase-supplier" />
            {!suppliers.length && <Link to="/products" className="inline-block mt-2 text-sm text-amber underline">Go to Products to add a supplier</Link>}
          </div>
        ) : <>
        <label className="text-xs text-gray-400">
          Supplier name *
          <input required value={form.supplierName} onChange={(event) => setForm({ ...form, supplierName: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-amber" placeholder="Supplier or company name" />
        </label>
        <label className="text-xs text-gray-400">
          Supplier email
          <input type="email" value={form.supplierEmail} onChange={(event) => setForm({ ...form, supplierEmail: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-amber" placeholder="orders@supplier.com" />
        </label>
        <label className="text-xs text-gray-400">
          Supplier phone
          <input value={form.supplierPhone} onChange={(event) => setForm({ ...form, supplierPhone: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-amber" placeholder="Contact number" />
        </label>
        </>}
        <div>
          <label htmlFor="purchase-date" className={labelClass}>Expected delivery date (optional)</label>
          <input {...feedback.field("purchase-date")} type="date" value={form.expectedDate}
            onChange={(event) => setForm({ ...form, expectedDate: event.target.value })}
            className={`mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 ${inputText}`} />
          <FieldError errors={feedback.errors} id="purchase-date" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-base">Order items</h3>
          <button type="button" disabled={inventoryMode && form.items.length >= 50}
            onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyPurchaseOrderItem()] }))}
            className="px-2 py-2 text-sm text-amber font-semibold hover:text-amber/70 disabled:opacity-50">+ Add another item</button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, index) => (
            <div key={index} className="grid md:grid-cols-12 gap-3 bg-gunmetal rounded-card p-3">
              <div className="md:col-span-12 flex items-center gap-2 border-b border-gray-700 pb-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-card bg-amber text-gunmetal font-mono-data text-xs font-bold">{index + 1}</span>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-300">Purchase order item</p>
              </div>
              <div className="md:col-span-6">
                <label htmlFor={`purchase-product-${index}`} className={labelClass}>{inventoryMode ? "Product *" : "Product or item type *"}</label>
                <select {...feedback.field(`purchase-product-${index}`)} required value={item.itemType === "NEW" ? "__new__" : item.productId}
                  onChange={(event) => selectProduct(index, event.target.value)}
                  className={`mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 ${inputText}`}>
                  <option value="">Select a product</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name} ({product.quantity} in stock)</option>)}
                  {!inventoryMode && <option value="__new__">+ New product not in catalog</option>}
                </select>
                <FieldError errors={feedback.errors} id={`purchase-product-${index}`} />
                {inventoryMode && !products.length && index === 0 &&
                  <Link to="/products" className="inline-block mt-2 text-sm text-amber underline">Go to Products to add an item</Link>}
              </div>
              <div className="md:col-span-2">
                <label htmlFor={`purchase-quantity-${index}`} className={labelClass}>{inventoryMode ? "Units to order *" : "Quantity *"}</label>
                <input {...feedback.field(`purchase-quantity-${index}`)} required min="1"
                  type={inventoryMode ? "text" : "number"} inputMode="numeric" value={item.orderedQuantity}
                  onChange={(event) => updateItem(index, "orderedQuantity", event.target.value)}
                  className={`mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 ${inputText}`} />
                <FieldError errors={feedback.errors} id={`purchase-quantity-${index}`} />
              </div>
              <div className="md:col-span-3">
                <label htmlFor={`purchase-cost-${index}`} className={labelClass}>{inventoryMode ? "Cost per unit (₱) *" : "Unit cost"}</label>
                <input {...feedback.field(`purchase-cost-${index}`)} required={inventoryMode} min="0" step="0.01"
                  type={inventoryMode ? "text" : "number"} inputMode="decimal" value={item.unitCost}
                  onChange={(event) => updateItem(index, "unitCost", event.target.value)}
                  className={`mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 ${inputText}`} placeholder="0.00" />
                <FieldError errors={feedback.errors} id={`purchase-cost-${index}`} />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button type="button" aria-label={`Remove line ${index + 1}`} disabled={form.items.length === 1} onClick={() => removeItem(index)} className="w-full px-2 py-2 text-[#F6A59F] text-sm font-semibold disabled:opacity-40">Remove</button>
              </div>
              {item.itemType === "NEW" && (
                <div className="md:col-span-12 border-t border-gray-700 pt-3 mt-1">
                  <p className="text-xs text-amber font-semibold mb-3">New catalog product details</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <label className="text-xs text-gray-400">SKU *<input required value={item.newProduct.sku} onChange={(event) => updateNewProduct(index, "sku", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="NEW-SKU-001" /></label>
                    <label className="text-xs text-gray-400">Product name *<input required value={item.newProduct.name} onChange={(event) => updateNewProduct(index, "name", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="Product name" /></label>
                    <label className="text-xs text-gray-400">Category *<select required value={item.newProduct.category} onChange={(event) => updateNewProduct(index, "category", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"><option value="">Select category</option>{categoryGroups.map((group) => <optgroup key={group.label} label={group.label}>{group.categories.map((category) => <option key={category} value={category}>{category}</option>)}</optgroup>)}</select></label>
                    <label className="text-xs text-gray-400">Selling price *<input required min="0" step="0.01" type="number" value={item.newProduct.price} onChange={(event) => updateNewProduct(index, "price", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="0.00" /></label>
                    <label className="text-xs text-gray-400">Low-stock alert<input min="0" type="number" value={item.newProduct.lowStockAt} onChange={(event) => updateNewProduct(index, "lowStockAt", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" /></label>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-3">This product will be added to Product Management only after you receive this PO.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <label className={`${labelClass} block`}>
        {inventoryMode ? "Order notes (optional)" : "PO remarks"}
        <textarea rows="3" maxLength={maxNoteLength} value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="Delivery instructions, payment terms, or other supplier notes" />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-700 pt-5">
        <p className="font-mono-data text-sm text-gray-300">Estimated total: <span className="text-amber font-bold">PHP {estimatedTotal.toLocaleString()}</span></p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-card bg-gray-700 text-sm font-semibold hover:bg-gray-600">Cancel</button>
          <button type="submit" className="px-4 py-2.5 rounded-card bg-amber text-gunmetal text-sm font-bold hover:bg-amber/80 disabled:opacity-50">
            {feedback.saving ? "Saving…" : "Create purchase order"}
          </button>
        </div>
      </div>
      </fieldset>
    </form>
  );
}

function ReceivingForm({ purchaseOrder, values, setValues, onSubmit, onCancel, saving }) {
  const items = inventoryMode ? purchaseOrder.items.filter((item) => item.missingQuantity > 0) : purchaseOrder.items;
  const issues = deliveryErrors(items, values);
  const feedback = useRestockingForm(issues, onSubmit, inventoryMode);

  function updateItem(itemId, field, value) {
    setValues((current) => current.map((item) => item.itemId === itemId ? { ...item, [field]: value } : item));
  }

  return (
    <form onSubmit={feedback.submit} noValidate={inventoryMode} aria-busy={saving}
      className="guided-form mt-5 border-t border-gray-700 pt-5">
      <fieldset disabled={saving} className="space-y-4 min-w-0">
      <div>
        <h3 className="font-heading text-lg">Check supplier delivery</h3>
        <p className="text-sm text-gray-300 mt-1">
          {inventoryMode
            ? "Count only what arrived in this delivery. Good units are added to stock. Enter 0 for items that didn’t arrive."
            : "Good units are added to stock. Damaged and missing units are recorded in Notes."}
        </p>
      </div>
      <FormErrorSummary errors={feedback.errors} />
      {items.map((item, index) => {
        const value = values.find((entry) => entry.itemId === item.id) ?? {};
        const due = inventoryMode ? item.missingQuantity : item.orderedQuantity;
        const missing = Math.max(0, due - (Number(value.goodQuantity) || 0) - (Number(value.damagedQuantity) || 0));
        const goodId = `delivery-good-${item.id}`;
        const damagedId = `delivery-damaged-${item.id}`;
        return (
          <div key={item.id} className="bg-gunmetal rounded-card p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div className="flex items-start gap-3"><span className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-card bg-amber text-gunmetal font-mono-data text-xs font-bold">{index + 1}</span><div><p className="text-sm font-semibold">{item.product?.name}</p><p className="text-xs text-gray-500 font-mono-data">{item.product?.sku}</p></div></div>
              <p className="text-xs text-gray-400">{inventoryMode ? "Still due" : "Ordered"} <span className="text-white font-bold">{due}</span></p>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor={goodId} className={labelClass}>Good units</label>
                <input {...feedback.field(goodId)} min="0" max={due} type={inventoryMode ? "text" : "number"}
                  inputMode="numeric" value={value.goodQuantity} autoFocus={inventoryMode && index === 0}
                  onChange={(event) => updateItem(item.id, "goodQuantity", event.target.value)}
                  className={`mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 ${inputText}`} />
                <FieldError errors={feedback.errors} id={goodId} />
              </div>
              <div>
                <label htmlFor={damagedId} className={labelClass}>Damaged units</label>
                <input {...feedback.field(damagedId)} min="0" max={due} type={inventoryMode ? "text" : "number"}
                  inputMode="numeric" value={value.damagedQuantity} onChange={(event) => updateItem(item.id, "damagedQuantity", event.target.value)}
                  className={`mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 ${inputText}`} />
                <FieldError errors={feedback.errors} id={damagedId} />
              </div>
              <div className={labelClass}>
                {inventoryMode ? "Still due after this delivery" : "Missing units"}
                <div className="mt-1 rounded-card px-3 py-2 border border-gray-700 bg-panel">
                  {inventoryMode && (issues[damagedId] || (issues[goodId] && Number(value.goodQuantity) !== 0))
                    ? "—" : missing}
                </div>
              </div>
              <label className={labelClass}>
                {inventoryMode ? "Inspection note (optional)" : "Inspection note"}
                <input maxLength={maxNoteLength} value={value.inspectionNote}
                  onChange={(event) => updateItem(item.id, "inspectionNote", event.target.value)}
                  className={`mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 ${inputText}`} placeholder="Example: box was damaged" />
              </label>
            </div>
          </div>
        );
      })}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-card bg-gray-700 text-sm font-semibold hover:bg-gray-600">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-card bg-olive text-gunmetal text-sm font-bold hover:bg-olive/80 disabled:opacity-50">{saving ? "Saving delivery…" : "Confirm receipt and update stock"}</button>
      </div>
      </fieldset>
    </form>
  );
}

function PurchaseOrderCard({ purchaseOrder, receivingId, receiptValues, setReceiptValues, onStartReceiving, onCancelReceiving, onReceive, onSend, onPrint, isPrintTarget, savingReceipt }) {
  const status = statusDetails[purchaseOrder.status] ?? statusDetails.DRAFT;
  return (
    <article className={`purchase-order-print-area bg-panel border border-gray-700 rounded-card overflow-hidden ${isPrintTarget ? "purchase-order-print-target" : ""}`}>
      <div className="p-5 flex flex-wrap items-start justify-between gap-4 border-b border-gray-700">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-xl">{purchaseOrder.poNumber}</h2>
            <span className={`px-2.5 py-1 rounded-pill text-xs font-bold uppercase tracking-wider ${status.className}`}>{status.label}</span>
          </div>
          <p className="text-sm text-gray-300 mt-1">{purchaseOrder.supplierName}</p>
          <p className="text-sm text-gray-300 mt-1">Created {formatDate(purchaseOrder.createdAt)} · Expected {formatDate(purchaseOrder.expectedDate)}</p>
          {inventoryMode && purchaseOrder.status === "DRAFT" && (
            <p className="mt-2 text-sm text-gray-300">Share this order with the supplier, then choose Mark as sent.</p>
          )}
          {inventoryMode && (purchaseOrder.status === "SENT" || purchaseOrder.status === "PARTIAL") && (
            <p className="mt-2 text-sm text-gray-300">When items arrive, choose Receive delivery.</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">PURCHASE TOTAL</p>
          <p className="font-mono-data text-lg text-amber font-bold">PHP {purchaseOrderTotal(purchaseOrder).toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gunmetal text-xs text-gray-400">
            <tr><th className="px-4 py-3 text-center">#</th><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Ordered</th><th className="px-4 py-3 text-right">Unit cost</th><th className="px-4 py-3 text-right">Good</th><th className="px-4 py-3 text-right">Damaged</th><th className="px-5 py-3 text-right">{inventoryMode ? "Outstanding" : "Missing"}</th></tr>
          </thead>
          <tbody>
            {purchaseOrder.items.map((item, index) => (
              <tr key={item.id} className="border-t border-gray-800">
                <td className="px-4 py-3 text-center font-mono-data text-amber font-bold">{index + 1}</td>
                <td className="px-4 py-3"><p>{item.product?.name ?? "Product removed"}</p><p className="text-[10px] text-gray-500 font-mono-data">{item.product?.sku}</p></td>
                <td className="px-4 py-3 text-right">{item.orderedQuantity}</td>
                <td className="px-4 py-3 text-right font-mono-data">PHP {Number(item.unitCost).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-olive">{purchaseOrder.receivedAt ? item.receivedQuantity : "—"}</td>
                <td className="px-4 py-3 text-right text-[#F6A59F]">{purchaseOrder.receivedAt ? item.damagedQuantity : "—"}</td>
                <td className="px-5 py-3 text-right text-amber">{inventoryMode || purchaseOrder.receivedAt ? item.missingQuantity : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inventoryMode && purchaseOrder.receipts.length > 0 && (
        <details className="mx-5 mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">Delivery history ({purchaseOrder.receipts.length})</summary>
          <ul className="mt-2 space-y-2">
            {purchaseOrder.receipts.map((receipt) => (
              <li key={receipt.id} className="bg-gunmetal rounded-card p-3">
                <p className="text-gray-400">Receipt #{receipt.id} · {formatDate(receipt.createdAt)}</p>
                {receipt.items.map((line) => {
                  const item = purchaseOrder.items.find(({ id }) => id === line.purchaseOrderItemId);
                  return (
                    <p key={line.id} className="mt-1">
                      {item.product.sku} · {line.goodQuantity} good, {line.damagedQuantity} damaged
                      {line.inspectionNote && <span className="text-gray-400"> · {line.inspectionNote}</span>}
                    </p>
                  );
                })}
              </li>
            ))}
          </ul>
        </details>
      )}

      {purchaseOrder.remarks && <div className="mx-5 mt-4 bg-gunmetal rounded-card p-3 text-xs text-gray-300"><span className="text-gray-500">Remarks: </span>{purchaseOrder.remarks}</div>}

      <div className="p-5 flex flex-wrap justify-between items-center gap-3 purchase-order-actions">
        <div className="text-xs text-gray-500">
          {purchaseOrder.supplierEmail && <span>{purchaseOrder.supplierEmail}</span>}
          {purchaseOrder.supplierEmail && purchaseOrder.supplierPhone && <span> · </span>}
          {purchaseOrder.supplierPhone && <span>{purchaseOrder.supplierPhone}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onPrint(purchaseOrder)} className="border border-gray-700 rounded-card px-3 py-2 text-xs font-semibold hover:border-amber hover:text-amber">Print PO</button>
          {purchaseOrder.status === "DRAFT" && <button onClick={() => onSend(purchaseOrder)} className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold hover:bg-amber/80">{inventoryMode ? "Mark as sent" : "Send to supplier"}</button>}
          {(purchaseOrder.status === "SENT" || purchaseOrder.status === "PARTIAL") && <button disabled={savingReceipt} onClick={() => onStartReceiving(purchaseOrder)} className="bg-olive text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold hover:bg-olive/80">Receive delivery</button>}
        </div>
      </div>

      {receivingId === purchaseOrder.id && <div className="px-5 pb-5"><ReceivingForm purchaseOrder={purchaseOrder} values={receiptValues} setValues={setReceiptValues} onSubmit={(event) => onReceive(event, purchaseOrder)} onCancel={onCancelReceiving} saving={savingReceipt} /></div>}
    </article>
  );
}

export default function Restocking() {
  const [activeTab, setActiveTab] = useState("purchase-orders");
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState(emptyPurchaseOrder);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [receivingId, setReceivingId] = useState(null);
  const [receiptValues, setReceiptValues] = useState([]);
  const [receiptRequest, setReceiptRequest] = useState(null);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const receiptInFlight = useRef(false);
  const [printPurchaseOrderId, setPrintPurchaseOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const errorBanner = useRef(null);
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (inventoryMode) {
      loadData();
      return;
    }
    const token = localStorage.getItem("onedepot_token");
    if (!token) { navigate("/login"); return; }
    try {
      const user = JSON.parse(atob(token.split(".")[1]));
      if (!(user.role === "OWNER" || user.role === "STAFF")) { navigate("/"); return; }
    } catch {
      navigate("/"); return;
    }
    loadData();
  }, [navigate]);

  useEffect(() => {
    if (error) errorBanner.current?.focus();
  }, [error]);

  function showRequestError(error, fallback) {
    if (inventoryMode && error.response?.status === 401) return;
    setError(error.response?.data?.error ?? fallback);
  }

  async function loadData() {
    try {
      setLoading(true);
      const [productsResponse, purchaseOrdersResponse, notesResponse, suppliersResponse] = await Promise.all([
        api.get("/products"),
        api.get("/purchase-orders"),
        api.get("/restock-notes"),
        inventoryMode ? api.get("/suppliers") : null,
      ]);
      if (suppliersResponse) setSuppliers(suppliersResponse.data);
      setProducts(productsResponse.data);
      setPurchaseOrders(purchaseOrdersResponse.data);
      setNotes(notesResponse.data);
      setError("");
    } catch (requestError) {
      showRequestError(requestError, "Could not load Restocking. Reload the page to try again.");
    } finally {
      setLoading(false);
    }
  }

  async function createPurchaseOrder(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/purchase-orders", { ...purchaseOrderForm, items: purchaseOrderForm.items });
      setPurchaseOrderForm(emptyPurchaseOrder);
      setShowCreateForm(false);
      setSuccess("Purchase order created as a draft.");
      await loadData();
    } catch (requestError) {
      showRequestError(requestError, "Could not confirm that the order was saved. Check Purchase orders before trying again.");
    }
  }

  async function sendToSupplier(purchaseOrder) {
    setError(""); setSuccess("");
    try {
      const { data } = await api.patch(`/purchase-orders/${purchaseOrder.id}/send`, {});
      setSuccess(`${data.poNumber} marked as sent to the supplier.`);
      await loadData();
    } catch (requestError) {
      showRequestError(requestError, "Could not send the purchase order");
    }
  }

  function startReceiving(purchaseOrder) {
    setReceivingId(purchaseOrder.id);
    setReceiptRequest(inventoryMode ? { requestId: crypto.randomUUID(), version: purchaseOrder.version } : null);
    setReceiptValues(purchaseOrder.items.map((item) => ({
      itemId: item.id, productId: item.productId,
      goodQuantity: inventoryMode ? 0 : item.orderedQuantity,
      damagedQuantity: 0, inspectionNote: "",
    })));
  }

  async function receivePurchaseOrder(event, purchaseOrder) {
    event.preventDefault();
    if (receiptInFlight.current) return;
    receiptInFlight.current = true;
    setSavingReceipt(true);
    setError(""); setSuccess("");
    try {
      const { data } = await api.patch(`/purchase-orders/${purchaseOrder.id}/receive`, { ...receiptRequest, items: receiptValues });
      setReceivingId(null);
      setReceiptValues([]);
      setSuccess(data.status === "PARTIAL"
        ? `${purchaseOrder.poNumber} delivery recorded. Outstanding units can be received later.`
        : `${purchaseOrder.poNumber} received. Good units were added to inventory and issues were saved to Notes.`);
      await loadData();
    } catch (requestError) {
      if (requestError.response?.data?.code === "ORDER_CHANGED") {
        setReceivingId(null);
        await loadData();
      }
      showRequestError(requestError, "Could not confirm that the delivery was saved. Try again from this form.");
    } finally {
      receiptInFlight.current = false;
      setSavingReceipt(false);
    }
  }

  async function addNote(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.post("/restock-notes", noteForm);
      setNoteForm(emptyNote);
      setSuccess("Restocking note added.");
      await loadData();
    } catch (requestError) {
      showRequestError(requestError, "Could not add the note");
    }
  }

  function printPurchaseOrder(purchaseOrder) {
    setPrintPurchaseOrderId(purchaseOrder.id);
    window.setTimeout(() => {
      window.print();
      setPrintPurchaseOrderId(null);
    }, 100);
  }

  const openPurchaseOrders = useMemo(() => purchaseOrders.filter((purchaseOrder) => ["DRAFT", "SENT", "PARTIAL"].includes(purchaseOrder.status)).length, [purchaseOrders]);
  const issueCount = useMemo(() => notes.filter((note) => note.type === "MISSING" || note.type === "DAMAGED").length, [notes]);

  return (
    <div className="min-h-screen">
      {inventoryMode ? <InventoryNavbar /> : <Navbar />}
      <main className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-7">
          <div><p className="text-xs font-mono-data text-amber tracking-widest mb-2">INVENTORY INBOUND</p><h1 className="font-heading text-3xl mb-2">Restocking & purchase orders</h1><p className="text-sm text-gray-400">Order from suppliers, inspect deliveries, and update stock accurately.</p></div>
          {activeTab === "purchase-orders" && <button onClick={() => setShowCreateForm((visible) => !visible)} className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold hover:bg-amber/80">{showCreateForm ? "Close form" : "+ Create purchase order"}</button>}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-panel rounded-card p-4 border border-gray-700"><p className="text-xs text-gray-500">TOTAL PURCHASE ORDERS</p><p className="font-heading text-2xl mt-1">{purchaseOrders.length}</p></div>
          <div className="bg-panel rounded-card p-4 border border-gray-700"><p className="text-xs text-gray-500">AWAITING ACTION</p><p className="font-heading text-2xl mt-1 text-amber">{openPurchaseOrders}</p></div>
          <div className="bg-panel rounded-card p-4 border border-gray-700"><p className="text-xs text-gray-500">RECORDED ISSUES</p><p className="font-heading text-2xl mt-1 text-[#F6A59F]">{issueCount}</p></div>
        </div>

        <div className="flex gap-2 border-b border-gray-700 mb-7">
          <button onClick={() => setActiveTab("purchase-orders")} className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === "purchase-orders" ? "border-amber text-amber" : "border-transparent text-gray-400 hover:text-white"}`}>Purchase orders</button>
          <button onClick={() => setActiveTab("notes")} className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === "notes" ? "border-amber text-amber" : "border-transparent text-gray-400 hover:text-white"}`}>Notes {notes.length ? `(${notes.length})` : ""}</button>
        </div>

        {error && <div ref={errorBanner} role="alert" tabIndex={-1} className="bg-warning/15 border border-warning/60 text-[#F6A59F] rounded-card px-4 py-3 mb-6 text-sm">{error}</div>}
        {success && <div role="status" className="bg-olive/15 border border-olive/60 text-olive rounded-card px-4 py-3 mb-6 text-sm">{success}</div>}

        {activeTab === "purchase-orders" && (
          <>
            {showCreateForm && <PurchaseOrderForm products={products} suppliers={suppliers} form={purchaseOrderForm} setForm={setPurchaseOrderForm} onSubmit={createPurchaseOrder} onCancel={() => setShowCreateForm(false)} />}
            {loading ? <p className="text-sm text-gray-400">Loading purchase orders...</p> : purchaseOrders.length ? (
              <div className="space-y-5">
                {purchaseOrders.map((purchaseOrder) => <PurchaseOrderCard key={purchaseOrder.id} purchaseOrder={purchaseOrder} receivingId={receivingId} receiptValues={receiptValues} setReceiptValues={setReceiptValues} onStartReceiving={startReceiving} onCancelReceiving={() => setReceivingId(null)} onReceive={receivePurchaseOrder} onSend={sendToSupplier} onPrint={printPurchaseOrder} isPrintTarget={printPurchaseOrderId === purchaseOrder.id} savingReceipt={savingReceipt} />)}
              </div>
            ) : <div className="bg-panel border border-gray-700 rounded-card p-8 text-center"><p className="font-heading text-xl mb-2">No purchase orders yet</p><p className="text-sm text-gray-400">Create your first PO when an item needs restocking.</p></div>}
          </>
        )}

        {activeTab === "notes" && (
          <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
            <RestockNoteForm note={noteForm} setNote={setNoteForm} purchaseOrders={purchaseOrders}
              products={products} onSubmit={addNote} />

            <div className="space-y-3">
              {loading ? <p className="text-sm text-gray-400">Loading notes...</p> : notes.length ? notes.map((note) => {
                const details = noteDetails[note.type] ?? noteDetails.GENERAL;
                return <article key={note.id} className="bg-panel border border-gray-700 rounded-card p-4"><div className="flex flex-wrap justify-between gap-3"><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-pill text-[10px] font-bold uppercase ${details.className}`}>{details.label}</span>{note.purchaseOrder && <span className="text-xs text-amber font-mono-data">{note.purchaseOrder.poNumber}</span>}</div><span className="text-xs text-gray-500">{formatDate(note.createdAt)}</span></div><p className="text-sm mt-3">{note.details}</p><div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-3">{note.product && <span>{note.product.sku} · {note.product.name}</span>}{note.quantity > 0 && <span>Quantity: {note.quantity}</span>}{note.author && <span>Logged by {note.author.name}</span>}</div></article>;
              }) : <div className="bg-panel border border-gray-700 rounded-card p-8 text-center"><p className="font-heading text-xl mb-2">No restocking notes</p><p className="text-sm text-gray-400">{inventoryMode ? "Damaged units and inspection notes appear here after receiving." : "Missing and damaged delivery items will appear here automatically."}</p></div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
