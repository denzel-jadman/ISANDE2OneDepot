import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";
import { categoryGroups } from "../constants/categories.js";

const emptyPurchaseOrderItem = () => ({
  itemType: "EXISTING",
  productId: "",
  orderedQuantity: "",
  unitCost: "",
  newProduct: { sku: "", name: "", category: "", price: "", lowStockAt: "3" },
});

const emptyPurchaseOrder = {
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
  RECEIVED: { label: "Received", className: "bg-olive/20 text-olive" },
  RECEIVED_WITH_ISSUES: { label: "Received with issues", className: "bg-warning/20 text-warning" },
};

const noteDetails = {
  GENERAL: { label: "General", className: "bg-gray-700 text-gray-200" },
  MISSING: { label: "Missing", className: "bg-amber/20 text-amber" },
  DAMAGED: { label: "Damaged", className: "bg-warning/20 text-warning" },
};

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function purchaseOrderTotal(purchaseOrder) {
  return purchaseOrder.items.reduce((sum, item) => sum + Number(item.orderedQuantity) * Number(item.unitCost), 0);
}

function PurchaseOrderForm({ products, form, setForm, onSubmit, onCancel }) {
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
    <form onSubmit={onSubmit} className="bg-panel border border-gray-700 rounded-card p-6 mb-8 space-y-6">
      <div>
        <h2 className="font-heading text-xl mb-1">New purchase order</h2>
        <p className="text-sm text-gray-400">Enter the supplier and the products you want to restock.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
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
        <label className="text-xs text-gray-400">
          Expected delivery
          <input type="date" value={form.expectedDate} onChange={(event) => setForm({ ...form, expectedDate: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-amber" />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-base">Order items</h3>
          <button type="button" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyPurchaseOrderItem()] }))} className="text-xs text-amber font-semibold hover:text-amber/70">+ Add another item</button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, index) => (
            <div key={index} className="grid md:grid-cols-12 gap-3 bg-gunmetal rounded-card p-3">
              <div className="md:col-span-12 flex items-center gap-2 border-b border-gray-700 pb-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-card bg-amber text-gunmetal font-mono-data text-xs font-bold">{index + 1}</span>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-300">Purchase order item</p>
              </div>
              <label className="md:col-span-6 text-xs text-gray-400">
                Product or item type *
                <select required value={item.itemType === "NEW" ? "__new__" : item.productId} onChange={(event) => selectProduct(index, event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber">
                  <option value="">Select a product</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name} ({product.quantity} in stock)</option>)}
                  <option value="__new__">+ New product not in catalog</option>
                </select>
              </label>
              <label className="md:col-span-2 text-xs text-gray-400">
                Quantity *
                <input required min="1" type="number" value={item.orderedQuantity} onChange={(event) => updateItem(index, "orderedQuantity", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" />
              </label>
              <label className="md:col-span-3 text-xs text-gray-400">
                Unit cost
                <input min="0" step="0.01" type="number" value={item.unitCost} onChange={(event) => updateItem(index, "unitCost", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="0.00" />
              </label>
              <div className="md:col-span-1 flex items-end">
                <button type="button" disabled={form.items.length === 1} onClick={() => removeItem(index)} className="w-full py-2 text-warning text-xs font-semibold disabled:opacity-30">Remove</button>
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

      <label className="text-xs text-gray-400 block">
        PO remarks
        <textarea rows="3" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="Delivery instructions, payment terms, or other supplier notes" />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-700 pt-5">
        <p className="font-mono-data text-sm text-gray-300">Estimated total: <span className="text-amber font-bold">PHP {estimatedTotal.toLocaleString()}</span></p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-card bg-gray-700 text-sm font-semibold hover:bg-gray-600">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-card bg-amber text-gunmetal text-sm font-bold hover:bg-amber/80">Create purchase order</button>
        </div>
      </div>
    </form>
  );
}

function ReceivingForm({ purchaseOrder, values, setValues, onSubmit, onCancel }) {
  function updateItem(itemId, field, value) {
    setValues((current) => current.map((item) => item.itemId === itemId ? { ...item, [field]: value } : item));
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 border-t border-gray-700 pt-5 space-y-4">
      <div>
        <h3 className="font-heading text-lg">Check supplier delivery</h3>
        <p className="text-xs text-gray-400 mt-1">Good units are added to stock. Damaged and missing units are recorded in Notes.</p>
      </div>
      {purchaseOrder.items.map((item, index) => {
        const value = values.find((entry) => entry.itemId === item.id) ?? {};
        const missing = Math.max(0, Number(item.orderedQuantity) - (Number(value.goodQuantity) || 0) - (Number(value.damagedQuantity) || 0));
        return (
          <div key={item.id} className="bg-gunmetal rounded-card p-4">
            <div className="flex flex-wrap justify-between gap-2 mb-3">
              <div className="flex items-start gap-3"><span className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-card bg-amber text-gunmetal font-mono-data text-xs font-bold">{index + 1}</span><div><p className="text-sm font-semibold">{item.product?.name}</p><p className="text-xs text-gray-500 font-mono-data">{item.product?.sku}</p></div></div>
              <p className="text-xs text-gray-400">Ordered: <span className="text-white font-bold">{item.orderedQuantity}</span></p>
            </div>
            <div className="grid sm:grid-cols-4 gap-3">
              <label className="text-xs text-gray-400">Good units<input min="0" max={item.orderedQuantity} type="number" value={value.goodQuantity} onChange={(event) => updateItem(item.id, "goodQuantity", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" /></label>
              <label className="text-xs text-gray-400">Damaged units<input min="0" max={item.orderedQuantity} type="number" value={value.damagedQuantity} onChange={(event) => updateItem(item.id, "damagedQuantity", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" /></label>
              <div className="text-xs text-gray-400">Missing units<div className={`mt-1 rounded-card px-3 py-2 border ${missing ? "border-warning/60 text-warning bg-warning/10" : "border-gray-700 text-olive bg-panel"}`}>{missing}</div></div>
              <label className="text-xs text-gray-400">Inspection note<input value={value.inspectionNote} onChange={(event) => updateItem(item.id, "inspectionNote", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="Optional details" /></label>
            </div>
          </div>
        );
      })}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-card bg-gray-700 text-sm font-semibold hover:bg-gray-600">Cancel</button>
        <button type="submit" className="px-4 py-2 rounded-card bg-olive text-gunmetal text-sm font-bold hover:bg-olive/80">Confirm receipt and update stock</button>
      </div>
    </form>
  );
}

function PurchaseOrderCard({ purchaseOrder, receivingId, receiptValues, setReceiptValues, onStartReceiving, onCancelReceiving, onReceive, onSend, onPrint, isPrintTarget }) {
  const status = statusDetails[purchaseOrder.status] ?? statusDetails.DRAFT;
  return (
    <article className={`purchase-order-print-area bg-panel border border-gray-700 rounded-card overflow-hidden ${isPrintTarget ? "purchase-order-print-target" : ""}`}>
      <div className="p-5 flex flex-wrap items-start justify-between gap-4 border-b border-gray-700">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-xl">{purchaseOrder.poNumber}</h2>
            <span className={`px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider ${status.className}`}>{status.label}</span>
          </div>
          <p className="text-sm text-gray-300 mt-1">{purchaseOrder.supplierName}</p>
          <p className="text-xs text-gray-500 mt-1">Created {formatDate(purchaseOrder.createdAt)} · Expected {formatDate(purchaseOrder.expectedDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">PURCHASE TOTAL</p>
          <p className="font-mono-data text-lg text-amber font-bold">PHP {purchaseOrderTotal(purchaseOrder).toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gunmetal text-xs text-gray-400">
            <tr><th className="px-4 py-3 text-center">#</th><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Ordered</th><th className="px-4 py-3 text-right">Unit cost</th><th className="px-4 py-3 text-right">Good</th><th className="px-4 py-3 text-right">Damaged</th><th className="px-5 py-3 text-right">Missing</th></tr>
          </thead>
          <tbody>
            {purchaseOrder.items.map((item, index) => (
              <tr key={item.id} className="border-t border-gray-800">
                <td className="px-4 py-3 text-center font-mono-data text-amber font-bold">{index + 1}</td>
                <td className="px-4 py-3"><p>{item.product?.name ?? "Product removed"}</p><p className="text-[10px] text-gray-500 font-mono-data">{item.product?.sku}</p></td>
                <td className="px-4 py-3 text-right">{item.orderedQuantity}</td>
                <td className="px-4 py-3 text-right font-mono-data">PHP {Number(item.unitCost).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-olive">{purchaseOrder.receivedAt ? item.receivedQuantity : "—"}</td>
                <td className="px-4 py-3 text-right text-warning">{purchaseOrder.receivedAt ? item.damagedQuantity : "—"}</td>
                <td className="px-5 py-3 text-right text-amber">{purchaseOrder.receivedAt ? item.missingQuantity : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {purchaseOrder.remarks && <div className="mx-5 mt-4 bg-gunmetal rounded-card p-3 text-xs text-gray-300"><span className="text-gray-500">Remarks: </span>{purchaseOrder.remarks}</div>}

      <div className="p-5 flex flex-wrap justify-between items-center gap-3 purchase-order-actions">
        <div className="text-xs text-gray-500">
          {purchaseOrder.supplierEmail && <span>{purchaseOrder.supplierEmail}</span>}
          {purchaseOrder.supplierEmail && purchaseOrder.supplierPhone && <span> · </span>}
          {purchaseOrder.supplierPhone && <span>{purchaseOrder.supplierPhone}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onPrint(purchaseOrder)} className="border border-gray-700 rounded-card px-3 py-2 text-xs font-semibold hover:border-amber hover:text-amber">Print PO</button>
          {purchaseOrder.status === "DRAFT" && <button onClick={() => onSend(purchaseOrder)} className="bg-amber text-gunmetal rounded-card px-3 py-2 text-xs font-bold hover:bg-amber/80">Send to supplier</button>}
          {purchaseOrder.status === "SENT" && <button onClick={() => onStartReceiving(purchaseOrder)} className="bg-olive text-gunmetal rounded-card px-3 py-2 text-xs font-bold hover:bg-olive/80">Receive delivery</button>}
        </div>
      </div>

      {receivingId === purchaseOrder.id && <div className="px-5 pb-5"><ReceivingForm purchaseOrder={purchaseOrder} values={receiptValues} setValues={setReceiptValues} onSubmit={(event) => onReceive(event, purchaseOrder)} onCancel={onCancelReceiving} /></div>}
    </article>
  );
}

export default function Restocking() {
  const [activeTab, setActiveTab] = useState("purchase-orders");
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [purchaseOrderForm, setPurchaseOrderForm] = useState(emptyPurchaseOrder);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [receivingId, setReceivingId] = useState(null);
  const [receiptValues, setReceiptValues] = useState([]);
  const [printPurchaseOrderId, setPrintPurchaseOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
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

  async function loadData() {
    try {
      setLoading(true);
      const [productsResponse, purchaseOrdersResponse, notesResponse] = await Promise.all([api.get("/products"), api.get("/purchase-orders"), api.get("/restock-notes")]);
      setProducts(productsResponse.data);
      setPurchaseOrders(purchaseOrdersResponse.data);
      setNotes(notesResponse.data);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not load restocking data");
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
      setError(requestError.response?.data?.error ?? "Could not create the purchase order");
    }
  }

  async function sendToSupplier(purchaseOrder) {
    setError(""); setSuccess("");
    try {
      const { data } = await api.patch(`/purchase-orders/${purchaseOrder.id}/send`, {});
      setSuccess(`${data.poNumber} marked as sent to the supplier.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not send the purchase order");
    }
  }

  function startReceiving(purchaseOrder) {
    setReceivingId(purchaseOrder.id);
    setReceiptValues(purchaseOrder.items.map((item) => ({ itemId: item.id, productId: item.productId, goodQuantity: item.orderedQuantity, damagedQuantity: 0, inspectionNote: "" })));
  }

  async function receivePurchaseOrder(event, purchaseOrder) {
    event.preventDefault();
    setError(""); setSuccess("");
    try {
      await api.patch(`/purchase-orders/${purchaseOrder.id}/receive`, { items: receiptValues });
      setReceivingId(null);
      setReceiptValues([]);
      setSuccess(`${purchaseOrder.poNumber} received. Good units were added to inventory and issues were saved to Notes.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not receive the purchase order");
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
      setError(requestError.response?.data?.error ?? "Could not add the note");
    }
  }

  function printPurchaseOrder(purchaseOrder) {
    setPrintPurchaseOrderId(purchaseOrder.id);
    window.setTimeout(() => {
      window.print();
      setPrintPurchaseOrderId(null);
    }, 100);
  }

  const openPurchaseOrders = useMemo(() => purchaseOrders.filter((purchaseOrder) => purchaseOrder.status === "DRAFT" || purchaseOrder.status === "SENT").length, [purchaseOrders]);
  const issueCount = useMemo(() => notes.filter((note) => note.type === "MISSING" || note.type === "DAMAGED").length, [notes]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-7">
          <div><p className="text-xs font-mono-data text-amber tracking-widest mb-2">INVENTORY INBOUND</p><h1 className="font-heading text-3xl mb-2">Restocking & purchase orders</h1><p className="text-sm text-gray-400">Order from suppliers, inspect deliveries, and update stock accurately.</p></div>
          {activeTab === "purchase-orders" && <button onClick={() => setShowCreateForm((visible) => !visible)} className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold hover:bg-amber/80">{showCreateForm ? "Close form" : "+ Create purchase order"}</button>}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-panel rounded-card p-4 border border-gray-700"><p className="text-xs text-gray-500">TOTAL PURCHASE ORDERS</p><p className="font-heading text-2xl mt-1">{purchaseOrders.length}</p></div>
          <div className="bg-panel rounded-card p-4 border border-gray-700"><p className="text-xs text-gray-500">AWAITING ACTION</p><p className="font-heading text-2xl mt-1 text-amber">{openPurchaseOrders}</p></div>
          <div className="bg-panel rounded-card p-4 border border-gray-700"><p className="text-xs text-gray-500">RECORDED ISSUES</p><p className="font-heading text-2xl mt-1 text-warning">{issueCount}</p></div>
        </div>

        <div className="flex gap-2 border-b border-gray-700 mb-7">
          <button onClick={() => setActiveTab("purchase-orders")} className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === "purchase-orders" ? "border-amber text-amber" : "border-transparent text-gray-400 hover:text-white"}`}>Purchase orders</button>
          <button onClick={() => setActiveTab("notes")} className={`px-4 py-3 text-sm font-semibold border-b-2 ${activeTab === "notes" ? "border-amber text-amber" : "border-transparent text-gray-400 hover:text-white"}`}>Notes {notes.length ? `(${notes.length})` : ""}</button>
        </div>

        {error && <div className="bg-warning/15 border border-warning/60 text-warning rounded-card px-4 py-3 mb-6 text-sm">{error}</div>}
        {success && <div className="bg-olive/15 border border-olive/60 text-olive rounded-card px-4 py-3 mb-6 text-sm">{success}</div>}

        {activeTab === "purchase-orders" && (
          <>
            {showCreateForm && <PurchaseOrderForm products={products} form={purchaseOrderForm} setForm={setPurchaseOrderForm} onSubmit={createPurchaseOrder} onCancel={() => setShowCreateForm(false)} />}
            {loading ? <p className="text-sm text-gray-400">Loading purchase orders...</p> : purchaseOrders.length ? (
              <div className="space-y-5">
                {purchaseOrders.map((purchaseOrder) => <PurchaseOrderCard key={purchaseOrder.id} purchaseOrder={purchaseOrder} receivingId={receivingId} receiptValues={receiptValues} setReceiptValues={setReceiptValues} onStartReceiving={startReceiving} onCancelReceiving={() => setReceivingId(null)} onReceive={receivePurchaseOrder} onSend={sendToSupplier} onPrint={printPurchaseOrder} isPrintTarget={printPurchaseOrderId === purchaseOrder.id} />)}
              </div>
            ) : <div className="bg-panel border border-gray-700 rounded-card p-8 text-center"><p className="font-heading text-xl mb-2">No purchase orders yet</p><p className="text-sm text-gray-400">Create your first PO when an item needs restocking.</p></div>}
          </>
        )}

        {activeTab === "notes" && (
          <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
            <form onSubmit={addNote} className="bg-panel border border-gray-700 rounded-card p-5 space-y-4">
              <div><h2 className="font-heading text-xl">Add a note</h2><p className="text-xs text-gray-400 mt-1">Log a supplier or delivery issue manually.</p></div>
              <label className="text-xs text-gray-400 block">Type<select value={noteForm.type} onChange={(event) => setNoteForm({ ...noteForm, type: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm"><option value="GENERAL">General</option><option value="MISSING">Missing item</option><option value="DAMAGED">Damaged / broken</option></select></label>
              <label className="text-xs text-gray-400 block">Purchase order<select value={noteForm.purchaseOrderId} onChange={(event) => setNoteForm({ ...noteForm, purchaseOrderId: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm"><option value="">No linked PO</option>{purchaseOrders.map((purchaseOrder) => <option key={purchaseOrder.id} value={purchaseOrder.id}>{purchaseOrder.poNumber} — {purchaseOrder.supplierName}</option>)}</select></label>
              <label className="text-xs text-gray-400 block">Product<select value={noteForm.productId} onChange={(event) => setNoteForm({ ...noteForm, productId: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm"><option value="">No specific product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>)}</select></label>
              <label className="text-xs text-gray-400 block">Affected quantity<input min="0" type="number" value={noteForm.quantity} onChange={(event) => setNoteForm({ ...noteForm, quantity: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm" /></label>
              <label className="text-xs text-gray-400 block">Details *<textarea required rows="4" value={noteForm.details} onChange={(event) => setNoteForm({ ...noteForm, details: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm" placeholder="Describe what was missing, broken, or needs follow-up" /></label>
              <button type="submit" className="w-full bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold hover:bg-amber/80">Save note</button>
            </form>

            <div className="space-y-3">
              {loading ? <p className="text-sm text-gray-400">Loading notes...</p> : notes.length ? notes.map((note) => {
                const details = noteDetails[note.type] ?? noteDetails.GENERAL;
                return <article key={note.id} className="bg-panel border border-gray-700 rounded-card p-4"><div className="flex flex-wrap justify-between gap-3"><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-pill text-[10px] font-bold uppercase ${details.className}`}>{details.label}</span>{note.purchaseOrder && <span className="text-xs text-amber font-mono-data">{note.purchaseOrder.poNumber}</span>}</div><span className="text-xs text-gray-500">{formatDate(note.createdAt)}</span></div><p className="text-sm mt-3">{note.details}</p><div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-3">{note.product && <span>{note.product.sku} · {note.product.name}</span>}{note.quantity > 0 && <span>Quantity: {note.quantity}</span>}{note.author && <span>Logged by {note.author.name}</span>}</div></article>;
              }) : <div className="bg-panel border border-gray-700 rounded-card p-8 text-center"><p className="font-heading text-xl mb-2">No restocking notes</p><p className="text-sm text-gray-400">Missing and damaged delivery items will appear here automatically.</p></div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
