import { useEffect, useState } from "react";
import BackLink from "../components/BackLink.jsx";
import Navbar from "../components/Navbar.jsx";
import { inventoryApi } from "../inventoryApi.js";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function currentStage(order) {
  if (order.completedAt) return ["Delivered", "The shop marked your delivery complete."];
  if (order.confirmedAt) return ["Order confirmed", "The shop verified your receipt and will prepare your order and book a Maxim rider."];
  if (order.proofNeedsReplacement) return ["New receipt needed", "The shop could not verify the receipt. Upload a clear image of the same GCash payment."];
  if (order.proofSubmittedAt) return ["Awaiting payment verification", "The shop has your receipt. Check this page for confirmation."];
  return ["Pay with GCash", order.demoPayment
    ? "Upload a sample receipt to try the shop’s payment verification."
    : "After paying, upload your GCash receipt for the shop to verify."];
}

export default function CustomerOrderStatus({ orderKey }) {
  const [order, setOrder] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    inventoryApi.get("/checkout/status", { headers: { "X-Order-Key": orderKey }, signal: controller.signal })
      .then(({ data }) => setOrder(data))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLoadError(err.response?.data?.error ?? "Could not load the order. Try refreshing the status.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [orderKey, refresh]);

  function refreshStatus() {
    setLoadError("");
    setLoading(true);
    setRefresh((value) => value + 1);
  }

  async function upload(event) {
    event.preventDefault();
    if (busy || loading) return;
    if (!file || !["image/png", "image/jpeg"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Choose a JPG or PNG receipt image up to 2 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await inventoryApi.put("/checkout/proof", file, {
        headers: { "X-Order-Key": orderKey, "Content-Type": file.type },
      });
      setFile(null);
      refreshStatus();
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not upload the receipt. Try again with the same image.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Private order link copied.");
    } catch {
      setCopyMessage("Copy the address from your browser to save this order link.");
    }
  }

  const [stage, description] = order ? currentStage(order) : ["Order status", ""];
  const total = order && order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, Number(order.deliveryFee));
  const needsProof = order && !order.confirmedAt && (!order.proofSubmittedAt || order.proofNeedsReplacement);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-xl px-5 py-6">
        <BackLink to="/shop">Back to shop</BackLink>
        <div className="mt-3 space-y-4 rounded-card bg-panel p-5">
          <h1 className="font-heading text-3xl" tabIndex={-1}>{stage}</h1>
          {loading && <p role="status">Checking your order…</p>}
          {loadError && <p role="alert" className="text-[#F6A59F]">{loadError}</p>}
          {order && <>
            <p className="text-sm text-gray-300">Order <strong className="text-amber">{order.reference}</strong></p>
            <p role="status">{description}</p>
            <div className="space-y-1 rounded-card bg-gunmetal p-3 text-sm">
              {order.items.map((item) => <p key={item.id} className="flex justify-between gap-3">
                <span>{item.quantity} × {item.name}</span><span>{money.format(Number(item.price) * item.quantity)}</span>
              </p>)}
              <p className="flex justify-between gap-3"><span>Delivery fee (Maxim)</span><span>{money.format(Number(order.deliveryFee))}</span></p>
              <p className="flex justify-between gap-3 border-t border-gray-700 pt-2 font-semibold"><span>Total</span><span>{money.format(total)}</span></p>
            </div>
            {order.demoPayment && <p className="rounded-card border border-amber/50 p-3 text-amber">
              Demo checkout. Use a sample image instead of sending money or uploading a real receipt.
            </p>}
            {needsProof && <>
              {order.payment && <div className="rounded-card bg-gunmetal p-3">
                <p>Send {money.format(total)} in the GCash app to <strong>{order.payment.name}</strong>.</p>
                <p className="mt-1 font-semibold">{order.payment.number}</p>
                <p className="mt-2 text-sm text-gray-300">If you already paid, upload your existing receipt.</p>
              </div>}
              {!order.demoPayment && !order.payment && !order.proofSubmittedAt && <p className="text-gray-300">
                GCash details are currently unavailable. Contact the shop for payment instructions.
              </p>}
              <form noValidate onSubmit={upload} className="space-y-3" aria-busy={busy}>
                <label className="block font-medium" htmlFor="payment-proof">GCash receipt (JPG or PNG, up to 2 MB)</label>
                <input id="payment-proof" type="file" accept="image/png,image/jpeg" disabled={busy || loading}
                  onChange={(event) => { setFile(event.target.files[0] ?? null); setError(""); }}
                  className="w-full text-sm file:mr-3 file:rounded-card file:border-0 file:bg-gunmetal file:p-3 file:text-gray-100" />
                {error && <p role="alert" className="text-[#F6A59F]">{error}</p>}
                <button type="submit" disabled={busy || loading || Boolean(loadError)}
                  className="min-h-11 w-full rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50">
                  {busy ? "Uploading…" : "Submit payment receipt"}
                </button>
              </form>
            </>}
          </>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refreshStatus} disabled={loading || busy}
              className="min-h-11 rounded-card border border-gray-700 px-4 text-amber disabled:opacity-50">Refresh status</button>
            {order && <button type="button" onClick={copyLink}
              className="min-h-11 rounded-card border border-gray-700 px-4 text-amber">Copy private order link</button>}
          </div>
          {copyMessage && <p role="status" className="text-sm text-gray-300">{copyMessage}</p>}
        </div>
      </main>
    </>
  );
}
