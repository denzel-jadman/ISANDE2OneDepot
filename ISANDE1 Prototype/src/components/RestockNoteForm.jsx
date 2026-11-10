import { inventoryMode } from "../inventoryApi.js";
import { noteErrors } from "../restockingValidation.js";
import { FieldError, FormErrorSummary, useRestockingForm } from "./RestockingFormFeedback.jsx";

const label = "block text-sm font-medium text-gray-200";
const control = "mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-base";

export default function RestockNoteForm({ note, setNote, purchaseOrders, products, onSubmit }) {
  const feedback = useRestockingForm(noteErrors(note), onSubmit, inventoryMode);

  function change(event) {
    const { name, value } = event.target;
    setNote((current) => ({ ...current, [name]: value }));
  }

  return (
    <form onSubmit={feedback.submit} noValidate={inventoryMode} aria-busy={feedback.saving}
      className="guided-form bg-panel border border-gray-700 rounded-card p-5">
      <fieldset disabled={feedback.saving} className="space-y-4 min-w-0">
        <div>
          <h2 className="font-heading text-xl">Add a note</h2>
          <p className="text-sm text-gray-300 mt-1">Describe a delivery issue or something to follow up with the supplier.</p>
        </div>
        <FormErrorSummary errors={feedback.errors} />
        <label className={label}>
          Type
          <select className={control} name="type" value={note.type} onChange={change}>
            <option value="GENERAL">General</option>
            <option value="MISSING">Missing item</option>
            <option value="DAMAGED">Damaged item</option>
          </select>
        </label>
        <label className={label}>
          Purchase order (optional)
          <select className={control} name="purchaseOrderId" value={note.purchaseOrderId} onChange={change}>
            <option value="">No linked purchase order</option>
            {purchaseOrders.map((order) => <option key={order.id} value={order.id}>{order.poNumber} — {order.supplierName}</option>)}
          </select>
        </label>
        <label className={label}>
          Product (optional)
          <select className={control} name="productId" value={note.productId} onChange={change}>
            <option value="">No specific product</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name}</option>)}
          </select>
        </label>
        <div>
          <label htmlFor="restock-note-quantity" className={label}>Units affected (optional)</label>
          <input {...feedback.field("restock-note-quantity")} className={control}
            name="quantity" min="0" type={inventoryMode ? "text" : "number"} inputMode="numeric"
            value={note.quantity} onChange={change} />
          <FieldError errors={feedback.errors} id="restock-note-quantity" />
        </div>
        <div>
          <label htmlFor="restock-note-details" className={label}>What happened? *</label>
          <textarea {...feedback.field("restock-note-details")} className={control}
            name="details" required rows="4" maxLength={inventoryMode ? 1000 : undefined}
            value={note.details} onChange={change} placeholder="Example: one item arrived damaged" />
          <FieldError errors={feedback.errors} id="restock-note-details" />
        </div>
        <button type="submit" className="w-full bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold disabled:opacity-50">
          {feedback.saving ? "Saving…" : "Save note"}
        </button>
      </fieldset>
    </form>
  );
}
