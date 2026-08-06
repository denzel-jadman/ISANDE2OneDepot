import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

function statusLabel(status) {
  return status === "COMPLETED" ? "COMPLETED ORDER" : status.replaceAll("_", " ");
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deliveryRiderLink, setDeliveryRiderLink] = useState("");

  function load() {
    api
      .get("/orders")
      .then((r) => {
        setOrders(r.data);
        setSelected((s) => s ?? r.data[0] ?? null);
      })
      .catch(() => setError("No orders"));
  }

  useEffect(load, []);

  async function confirm(id) {
    try {
      await api.patch(`/orders/${id}/confirm`);
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: "PREPARING" } : order)));
      setSelected((current) => (current?.id === id ? { ...current, status: "PREPARING" } : current));
      setNotice(`Order #ORD-${id} confirmed and moved to Preparing. Stock has been deducted.`);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not confirm the order.");
    }
  }

  async function markOutForDelivery(id) {
    try {
      const { data } = await api.patch(`/orders/${id}/out-for-delivery`, { deliveryRiderLink });
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: data.status, deliveryRiderLink: data.deliveryRiderLink } : order)));
      setSelected((current) => (current?.id === id ? { ...current, status: data.status, deliveryRiderLink: data.deliveryRiderLink } : current));
      setNotice(`Order #ORD-${id} is now Out for delivery.`);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not update the delivery status.");
    }
  }

  async function completeOrder(id) {
    try {
      const { data } = await api.patch(`/orders/${id}/complete`);
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: data.status } : order)));
      setSelected((current) => (current?.id === id ? { ...current, status: data.status } : current));
      setNotice(`Order #ORD-${id} marked as completed.`);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not complete the order.");
    }
  }

  async function reject(id) {
    try {
      await api.patch(`/orders/${id}/reject`);
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: "REJECTED" } : order)));
      setSelected((current) => (current?.id === id ? { ...current, status: "REJECTED" } : current));
      setNotice(`Order #ORD-${id} was rejected.`);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not reject the order.");
    }
  }

  async function requestNewProof(id) {
    try {
      await api.patch(`/orders/${id}/request-proof`);
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: "PENDING_PAYMENT", proofOfPayment: null } : order)));
      setSelected((current) => (current?.id === id ? { ...current, status: "PENDING_PAYMENT", proofOfPayment: null } : current));
      setNotice(`Customer has been asked to resubmit proof of payment for order #ORD-${id}.`);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not request a new proof of payment.");
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        {error && <p className="text-warning text-sm mb-4">{error}</p>}
        {notice && <p className="bg-olive/20 border border-olive text-olive rounded-card px-4 py-3 mb-4 text-sm">{notice}</p>}

        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          <div className="bg-panel rounded-card p-4">
            <h2 className="font-heading text-sm mb-1">Pending orders</h2>
            <p className="text-xs text-gray-500 mb-4">
              {orders.filter((o) => o.status === "PENDING_VERIFICATION").length} awaiting payment verification
            </p>
            <div className="space-y-2">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setSelected(o); setDeliveryRiderLink(o.deliveryRiderLink ?? ""); }}
                  className={`w-full text-left rounded-card p-3 border ${
                    selected?.id === o.id ? "border-amber bg-gunmetal" : "border-transparent bg-gunmetal/50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono-data text-gray-500">#ORD-{o.id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-pill ${
                        o.status === "PREPARING" || o.status === "OUT_FOR_DELIVERY" || o.status === "COMPLETED"
                          ? "bg-olive/30 text-olive"
                          : o.status === "REJECTED"
                          ? "bg-warning/30 text-warning"
                          : "bg-amber/30 text-amber"
                      }`}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </div>
                  <p className="text-sm">{o.customer?.name ?? "Guest"}</p>
                  <p className="text-xs text-gray-500">
                    {o.items?.length ?? 0} items · ₱{Number(o.total).toLocaleString()}
                  </p>
                </button>
              ))}
              {orders.length === 0 && !error && <p className="text-gray-500 text-sm">No orders yet.</p>}
            </div>
          </div>

          {selected && (
            <div className="bg-panel rounded-card p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-heading text-lg">Order #ORD-{selected.id}</h2>
                  <p className="text-xs text-gray-500">
                    {selected.customer?.name ?? "Guest"} · {selected.contactNumber}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-pill bg-amber/30 text-amber">
                  {statusLabel(selected.status)}
                </span>
              </div>

              <h3 className="text-xs text-gray-500 mb-2">ITEMS</h3>
              <div className="space-y-1 text-sm mb-4">
                {selected.items?.map((i) => (
                  <div key={i.id} className="flex justify-between">
                    <span>{i.product?.name} × {i.quantity}</span>
                    <span className="font-mono-data">₱{(Number(i.unitPrice) * i.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold pt-2 border-t border-gray-700">
                  <span>Total</span>
                  <span className="text-amber font-mono-data">₱{Number(selected.total).toLocaleString()}</span>
                </div>
              </div>

              <h3 className="text-xs text-gray-500 mb-2">PROOF OF PAYMENT</h3>
              {selected.proofOfPayment ? (
                <img src={selected.proofOfPayment} alt="Proof of payment" className="rounded-card mb-5 max-h-64" />
              ) : (
                <p className="text-gray-500 text-sm mb-5">No screenshot uploaded.</p>
              )}

              {selected.status === "PENDING_VERIFICATION" && (
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <button
                      onClick={() => confirm(selected.id)}
                      className="flex-1 bg-amber text-gunmetal font-semibold rounded-card py-2 text-sm"
                    >
                      Confirm order
                    </button>
                    <button
                      onClick={() => reject(selected.id)}
                      className="flex-1 border border-gray-700 rounded-card py-2 text-sm hover:border-warning"
                    >
                      Reject and notify
                    </button>
                  </div>
                  <button
                    onClick={() => requestNewProof(selected.id)}
                    className="w-full border border-amber text-amber rounded-card py-2 text-sm hover:bg-amber/10"
                  >
                    Request new proof of payment
                  </button>
                </div>
              )}
              {selected.status === "PREPARING" && (
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">Delivery rider tracking link</label>
                  <input
                    type="url"
                    value={deliveryRiderLink}
                    onChange={(event) => setDeliveryRiderLink(event.target.value)}
                    placeholder="https://..."
                    className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
                  />
                  <button
                    onClick={() => markOutForDelivery(selected.id)}
                    disabled={!deliveryRiderLink.trim()}
                    className="w-full bg-amber text-gunmetal font-semibold rounded-card py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mark out for delivery
                  </button>
                </div>
              )}
              {selected.status === "OUT_FOR_DELIVERY" && (
                <button
                  onClick={() => completeOrder(selected.id)}
                  className="w-full border border-olive text-olive font-semibold rounded-card py-2 text-sm hover:bg-olive/10"
                >
                  Mark as completed
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
