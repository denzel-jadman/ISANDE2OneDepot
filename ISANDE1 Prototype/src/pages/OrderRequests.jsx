import { useEffect, useState } from "react";
import InventoryNavbar from "../components/InventoryNavbar.jsx";
import { inventoryApi } from "../inventoryApi.js";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const actionMessages = {
  review: "Request reviewed. Confirm the order when the customer agrees to proceed.",
  "request-proof": "The customer’s order page now asks them to upload a new receipt.",
  confirm: "Order confirmed. Stock was deducted. Prepare the order for pickup or delivery.",
  complete: "Order marked as completed.",
};

function orderStage(order) {
  if (order.completedAt) return "Completed";
  if (order.confirmedAt) return "Confirmed";
  if (order.proofNeedsReplacement) return "Waiting for new receipt";
  if (order.deliveryAddress) return order.reviewedAt ? "Payment verified" : "Verify payment";
  if (order.reviewedAt) return "Reviewed";
  return "New request";
}

export default function OrderRequests() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    inventoryApi.get("/customer-requests", { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setOrders(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted && err.response?.status !== 401) {
          setError("Could not load order requests. Refresh the list to try again.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  async function updateOrder(order, action) {
    const { id } = order;
    setSaving(id);
    setFeedback(null);
    try {
      const { data } = await inventoryApi.patch(`/customer-requests/${id}/${action}`,
        order.proofSubmittedAt && { proofSubmittedAt: order.proofSubmittedAt });
      setOrders((current) => current.map((order) => order.id === id ? { ...order, ...data } : order));
      setConfirming(null);
      setFeedback({ id, message: order.deliveryAddress && action === "review"
        ? "Payment verified. Confirm the order to deduct stock and show confirmation to the customer."
        : actionMessages[action] });
    } catch (err) {
      if (err.response?.status !== 401) {
        setFeedback({ id, error: true, message: err.response?.data?.error ?? "Could not save the order update. Try again." });
      }
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <InventoryNavbar />
      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl">Customer order requests</h1>
            <p className="mt-2 text-gray-300">Review requests and verify GCash receipts before confirming checkout orders.</p>
          </div>
          <button type="button" onClick={() => {
            setFeedback(null);
            setConfirming(null);
            setRefresh((value) => value + 1);
          }} disabled={loading || saving !== null}
            className="min-h-11 rounded-card border border-gray-700 px-4 font-semibold text-amber disabled:opacity-50">Refresh list</button>
        </div>

        {error && <p role="alert" className="my-4 rounded-card border border-warning/60 p-3 text-[#F6A59F]">{error}</p>}
        {loading ? <p role="status" className="mt-5 text-gray-300">Loading requests…</p>
          : !error && !orders.length && <p className="mt-5 text-gray-300">No customer requests yet.</p>}
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-card border border-gray-700 bg-panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl">{order.reference}</h2>
                <span className={`rounded-pill px-2.5 py-1 text-sm ${order.reviewedAt ? "bg-gunmetal text-gray-200" : "bg-amber text-gunmetal"}`}>
                  {orderStage(order)}
                </span>
              </div>
              <p className="mt-2 font-semibold">{order.name}</p>
              <p className="mt-1 text-gray-200">{order.phone}</p>
              <p className="mt-1 text-sm text-gray-300">{new Date(order.createdAt).toLocaleString()}</p>
              {order.deliveryAddress && <div className="mt-3 space-y-1 text-sm text-gray-200">
                {order.demoPayment && <p className="font-semibold text-amber">Demo order</p>}
                <p className="font-semibold">Delivery address</p>
                <p className="whitespace-pre-wrap break-words">{order.deliveryAddress}</p>
              </div>}
              {order.note && <p className="mt-3 whitespace-pre-wrap break-words text-gray-200">{order.note}</p>}
              <ul className="mt-4 divide-y divide-gray-700 rounded-card bg-gunmetal">
                {order.items.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-2 p-3">
                    <span>{item.quantity} × {item.name} <span className="text-sm text-gray-300">({item.sku})</span></span>
                    <span>{money.format(Number(item.price))} each</span>
                  </li>
                ))}
              </ul>
              {order.deliveryAddress && <div className="mt-3 space-y-1 text-sm">
                <p>Delivery fee (Maxim) {money.format(Number(order.deliveryFee))}</p>
                <p className="font-semibold">Total {money.format(order.items.reduce((sum, item) =>
                  sum + Number(item.price) * item.quantity, Number(order.deliveryFee)))}</p>
                <a href={`/api/inventory/customer-requests/${order.id}/proof`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center font-semibold text-amber underline">Open GCash receipt (new tab)</a>
              </div>}
              {feedback?.id === order.id && (
                <p role={feedback.error ? "alert" : "status"}
                  className={`mt-4 rounded-card border border-gray-700 p-3 text-sm ${feedback.error ? "text-[#F6A59F]" : "text-gray-200"}`}>
                  {feedback.message}
                </p>
              )}
              {!order.reviewedAt && !order.proofNeedsReplacement && <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-300">{order.deliveryAddress
                  ? order.demoPayment ? "Open the sample receipt to try the verification step."
                    : "Open the receipt and match the amount and reference with your GCash transaction history."
                  : "Check the requested items and contact details first."}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => updateOrder(order, "review")} disabled={saving !== null}
                    className="min-h-11 rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50">
                    {saving === order.id ? "Saving…" : order.deliveryAddress ? "Mark payment verified" : "Mark as reviewed"}
                  </button>
                  {order.deliveryAddress && <button type="button" onClick={() => updateOrder(order, "request-proof")} disabled={saving !== null}
                    className="min-h-11 rounded-card border border-gray-700 px-4 text-amber disabled:opacity-50">Request a new receipt</button>}
                </div>
              </div>}
              {order.reviewedAt && !order.confirmedAt && (
                <div className="mt-4 space-y-2">
                  {confirming === order.id ? (
                    <>
                      <p id={`confirm-order-${order.id}`} className="text-sm text-gray-200">
                        Confirm the order at the prices shown above and deduct these units from available stock.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => updateOrder(order, "confirm")} disabled={saving !== null}
                          aria-describedby={`confirm-order-${order.id}`}
                          className="min-h-11 rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50">
                          {saving === order.id ? "Confirming…" : "Confirm and deduct stock"}
                        </button>
                        <button type="button" onClick={() => { setConfirming(null); setFeedback(null); }}
                          disabled={saving !== null} className="min-h-11 rounded-card border border-gray-700 px-4">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-300">{order.deliveryAddress
                        ? "Confirm to update the customer’s order status and deduct stock."
                        : "Contact the customer to agree on payment and pickup or delivery before confirming."}</p>
                      <button type="button" onClick={() => { setConfirming(order.id); setFeedback(null); }} disabled={saving !== null}
                        className="min-h-11 rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50">Confirm order</button>
                    </>
                  )}
                </div>
              )}
              {order.confirmedAt && !order.completedAt && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-300">{order.deliveryAddress
                    ? "Pack the items, book a Maxim rider, then mark the order delivered once the customer receives it."
                    : "After handing the items to the customer or completing delivery, mark the order as completed."}</p>
                  <button type="button" onClick={() => updateOrder(order, "complete")} disabled={saving !== null}
                    className="min-h-11 rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50">
                    {saving === order.id ? "Saving…" : order.deliveryAddress ? "Mark as delivered" : "Mark as completed"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
