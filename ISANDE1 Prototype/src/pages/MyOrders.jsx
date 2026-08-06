import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

const activeStatuses = ["PENDING_PAYMENT", "PENDING_VERIFICATION", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY"];

function statusStyle(status) {
  if (["CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "DELIVERED"].includes(status)) return "bg-olive/30 text-olive";
  if (status === "REJECTED") return "bg-warning/30 text-warning";
  return "bg-amber/30 text-amber";
}

function statusLabel(status) {
  return status === "COMPLETED" ? "COMPLETED ORDER" : status.replaceAll("_", " ");
}

function OrderCard({ order, onReceived, receiving, onResubmitProof, resubmitting }) {
  return (
    <article className="bg-panel border border-gray-700 rounded-card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-mono-data text-gray-500">ORDER #ORD-{order.id}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-pill ${statusStyle(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 text-gray-300">
            <span>{item.product?.name ?? "Product no longer available"} x{item.quantity}</span>
            <span className="font-mono-data whitespace-nowrap">
              PHP {(Number(item.unitPrice) * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between font-semibold pt-3 mt-4 border-t border-gray-700">
        <span>Total</span>
        <span className="text-amber font-mono-data">PHP {Number(order.total).toLocaleString()}</span>
      </div>
      {order.status === "OUT_FOR_DELIVERY" && (
        <div className="mt-4">
          {order.deliveryRiderLink && (
            <a href={order.deliveryRiderLink} target="_blank" rel="noreferrer" className="block w-full text-center border border-amber text-amber rounded-card py-2 text-sm mb-2 hover:bg-amber/10">
              Track delivery rider
            </a>
          )}
          <button
            onClick={() => onReceived(order.id)}
            disabled={receiving}
            className="w-full bg-amber text-gunmetal font-semibold rounded-card py-2 text-sm disabled:opacity-50"
          >
            {receiving ? "Confirming..." : "Received order"}
          </button>
          <p className="text-[11px] text-gray-500 text-center mt-2">Confirm once you have received your order.</p>
        </div>
      )}
      {order.status === "PENDING_PAYMENT" && (
        <div className="mt-4">
          <p className="text-xs text-warning mb-2">The owner requested a new proof of payment for this order.</p>
          <label className="block w-full text-center border border-amber text-amber rounded-card py-2 text-sm cursor-pointer hover:bg-amber/10">
            {resubmitting ? "Submitting proof..." : "Resubmit proof of payment"}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              disabled={resubmitting}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onResubmitProof(order.id, file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </article>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receivingId, setReceivingId] = useState(null);
  const [resubmittingId, setResubmittingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("onedepot_token")) {
      navigate("/login");
      return;
    }

    api
      .get("/orders/mine")
      .then((response) => setOrders(response.data))
      .catch((requestError) => {
        if (requestError.response?.status === 401) {
          localStorage.removeItem("onedepot_token");
          navigate("/login");
          return;
        }
        setError(requestError.response?.data?.error ?? "We couldn't load your orders. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const incoming = orders.filter((order) => activeStatuses.includes(order.status));
  const past = orders.filter((order) => !activeStatuses.includes(order.status));

  async function confirmReceived(id) {
    try {
      setReceivingId(id);
      const { data } = await api.patch(`/orders/${id}/received`);
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: data.status } : order)));
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not confirm receipt of this order.");
    } finally {
      setReceivingId(null);
    }
  }

  async function resubmitProof(id, file) {
    try {
      setResubmittingId(id);
      setError("");
      const formData = new FormData();
      formData.append("proofOfPayment", file);
      const { data } = await api.patch(`/orders/${id}/proof-of-payment`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: data.status, proofOfPayment: data.proofOfPayment } : order)));
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not submit the new proof of payment.");
    } finally {
      setResubmittingId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-xs text-amber tracking-widest mb-2 font-mono-data">ORDER CENTER</p>
        <h1 className="font-heading text-3xl mb-2">My orders</h1>
        <p className="text-gray-400 text-sm mb-8">Track current purchases and review your previous orders.</p>

        {loading && <p className="text-gray-400 text-sm">Loading orders...</p>}
        {error && <p className="text-warning text-sm">{error}</p>}

        {!loading && !error && (
          <div className="space-y-10">
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-heading text-lg">Incoming orders</h2>
                <span className="text-xs text-gray-500">{incoming.length} active</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {incoming.map((order) => <OrderCard key={order.id} order={order} onReceived={confirmReceived} receiving={receivingId === order.id} onResubmitProof={resubmitProof} resubmitting={resubmittingId === order.id} />)}
              </div>
              {incoming.length === 0 && (
                <p className="bg-panel rounded-card p-5 text-sm text-gray-400">You have no incoming orders.</p>
              )}
            </section>

            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-heading text-lg">Past orders</h2>
                <span className="text-xs text-gray-500">{past.length} completed or cancelled</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {past.map((order) => <OrderCard key={order.id} order={order} onReceived={confirmReceived} receiving={receivingId === order.id} onResubmitProof={resubmitProof} resubmitting={resubmittingId === order.id} />)}
              </div>
              {past.length === 0 && (
                <p className="bg-panel rounded-card p-5 text-sm text-gray-400">Your completed and cancelled orders will appear here.</p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
