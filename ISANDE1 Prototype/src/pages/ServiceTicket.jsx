import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

const STAGES = [
  { key: "AWAITING_GUNSMITH", label: "Ticket received and assigned" },
  { key: "IN_REPAIR", label: "Gunsmith repair in progress" },
  { key: "AWAITING_OWNER_PRICING", label: "Work logged and sent for pricing" },
  { key: "AWAITING_PAYMENT", label: "Quote sent to customer" },
  { key: "PAID_READY_FOR_PICKUP", label: "Paid and ready for pickup" },
  { key: "COMPLETED", label: "Item returned to customer" },
];

const stageByStatus = {
  AWAITING_GUNSMITH: 0,
  IN_REPAIR: 1,
  AWAITING_OWNER_PRICING: 2,
  AWAITING_PAYMENT: 3,
  PAYMENT_SUBMITTED: 3,
  PAID_READY_FOR_PICKUP: 4,
  COMPLETED: 5,
};

const statusLabels = {
  AWAITING_GUNSMITH: "Awaiting gunsmith",
  IN_REPAIR: "Repair in progress",
  AWAITING_OWNER_PRICING: "Awaiting owner pricing",
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_SUBMITTED: "Payment proof submitted",
  PAID_READY_FOR_PICKUP: "Paid · ready for pickup",
  COMPLETED: "Completed",
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function Money({ value, className = "" }) {
  return <span className={`font-mono-data ${className}`}>PHP {Number(value || 0).toLocaleString()}</span>;
}

function RepairPrintDocument({ ticket, type }) {
  const isReceipt = type === "receipt";
  const documentDate = isReceipt ? ticket.paidAt : ticket.quoteSentAt;
  return (
    <section className="repair-print-document repair-print-target">
      <header className="flex justify-between items-start border-b-2 border-black pb-5 mb-6">
        <div><h1 className="font-heading text-3xl">JUSTIN&apos;S HOBBY DEPOT</h1><p className="text-sm mt-1">Airsoft sales, parts, and repair services</p></div>
        <div className="text-right"><p className="font-heading text-2xl">{isReceipt ? "CUSTOMER RECEIPT" : "REPAIR INVOICE"}</p><p className="font-mono-data text-sm">{isReceipt ? `RCT-SVC-${ticket.id}` : `INV-SVC-${ticket.id}`}</p><p className="text-sm mt-1">{new Date(documentDate || Date.now()).toLocaleDateString()}</p></div>
      </header>

      <div className="grid grid-cols-2 gap-8 mb-7 text-sm">
        <div><p className="text-xs font-bold mb-2">BILL TO</p><p className="font-semibold">{ticket.customer?.name}</p><p>{ticket.customer?.phone || "No contact number"}</p></div>
        <div><p className="text-xs font-bold mb-2">SERVICE DETAILS</p><p>Ticket: #SVC-{ticket.id}</p><p>Item: {ticket.unitType}</p><p>Labor type: {ticket.complexity}</p></div>
      </div>

      <table className="w-full text-sm border-collapse mb-6">
        <thead><tr className="border-y-2 border-black"><th className="text-left py-2">Description</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Unit price</th><th className="text-right py-2">Amount</th></tr></thead>
        <tbody>
          {ticket.partsUsed.map((part) => <tr key={part.id} className="border-b border-gray-400"><td className="py-2"><p>{part.name}</p><p className="text-xs">{part.sku}</p></td><td className="text-right py-2">{part.quantity}</td><td className="text-right py-2">PHP {Number(part.unitPrice).toLocaleString()}</td><td className="text-right py-2">PHP {Number(part.lineTotal).toLocaleString()}</td></tr>)}
          <tr className="border-b border-gray-400"><td className="py-2">{ticket.complexity === "COMPLEX" ? "Complex" : "Simple"} repair labor</td><td className="text-right py-2">1</td><td className="text-right py-2">PHP {Number(ticket.laborPrice).toLocaleString()}</td><td className="text-right py-2">PHP {Number(ticket.laborPrice).toLocaleString()}</td></tr>
        </tbody>
      </table>

      <div className="ml-auto max-w-sm text-sm space-y-2"><div className="flex justify-between"><span>Parts subtotal</span><span>PHP {Number(ticket.partsTotal).toLocaleString()}</span></div><div className="flex justify-between"><span>Labor</span><span>PHP {Number(ticket.laborPrice).toLocaleString()}</span></div><div className="flex justify-between border-t-2 border-black pt-3 text-xl font-bold"><span>{isReceipt ? "Total paid" : "Total due"}</span><span>PHP {Number(ticket.totalPrice).toLocaleString()}</span></div></div>

      {isReceipt && <div className="mt-8 border-2 border-black p-4 text-sm"><p className="font-bold">PAYMENT CONFIRMED</p><p className="mt-1">Method: {ticket.paymentMethod === "GCASH" ? "GCash" : "In-store payment"}</p><p>Paid on: {new Date(ticket.paidAt).toLocaleString()}</p></div>}
      <footer className="mt-12 pt-4 border-t border-gray-400 text-xs text-center">Thank you for choosing Justin&apos;s Hobby Depot. Please keep this {isReceipt ? "receipt" : "invoice"} for your records.</footer>
    </section>
  );
}

export default function ServiceTicket() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [products, setProducts] = useState([]);
  const [repairSettings, setRepairSettings] = useState({ complexLaborPrice: 1500, gcashInstructions: "" });
  const [workForm, setWorkForm] = useState({ complexity: "SIMPLE", workPerformed: "", gunsmithNotes: "", partsUsed: [] });
  const [simpleLaborPrice, setSimpleLaborPrice] = useState("");
  const [paymentProof, setPaymentProof] = useState(null);
  const [printDocument, setPrintDocument] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function loadTicket() {
    return api.get(`/service-tickets/${id}`).then((response) => setTicket(response.data));
  }

  useEffect(() => {
    try {
      const token = localStorage.getItem("onedepot_token");
      if (token) setUser(JSON.parse(atob(token.split(".")[1])));
    } catch {
      setError("Please log in again.");
    }
    Promise.all([api.get(`/service-tickets/${id}`), api.get("/products"), api.get("/repair-settings")])
      .then(([ticketResponse, productsResponse, settingsResponse]) => {
        setTicket(ticketResponse.data);
        setProducts([...productsResponse.data].sort((a, b) => a.name.localeCompare(b.name)));
        setRepairSettings(settingsResponse.data);
      })
      .catch((requestError) => setError(requestError.response?.data?.error ?? "No service ticket found with that ID."));
  }, [id]);

  function showSuccess(message) {
    setSuccess(message);
    setError("");
  }

  function showError(requestError, fallback) {
    setError(requestError.response?.data?.error ?? fallback);
    setSuccess("");
  }

  async function startRepair() {
    try {
      const { data } = await api.patch(`/service-tickets/${id}/start`, {});
      setTicket(data);
      showSuccess("Repair started. Log the work and any shop parts used when finished.");
    } catch (requestError) { showError(requestError, "Could not start the repair."); }
  }

  function addPart() {
    setWorkForm((current) => ({ ...current, partsUsed: [...current.partsUsed, { productId: "", quantity: 1 }] }));
  }

  function updatePart(index, field, value) {
    setWorkForm((current) => ({ ...current, partsUsed: current.partsUsed.map((part, partIndex) => partIndex === index ? { ...part, [field]: value } : part) }));
  }

  function removePart(index) {
    setWorkForm((current) => ({ ...current, partsUsed: current.partsUsed.filter((_, partIndex) => partIndex !== index) }));
  }

  async function submitWork(event) {
    event.preventDefault();
    try {
      const { data } = await api.patch(`/service-tickets/${id}/submit-work`, { ...workForm, partsUsed: workForm.partsUsed.filter((part) => part.productId) });
      setTicket(data);
      showSuccess("Work log submitted. Used parts were deducted from shop inventory and the ticket was sent to the owner for pricing.");
    } catch (requestError) { showError(requestError, "Could not submit the repair work."); }
  }

  async function approvePrice(event) {
    event.preventDefault();
    try {
      const { data } = await api.patch(`/service-tickets/${id}/approve-price`, { laborPrice: simpleLaborPrice });
      setTicket(data);
      showSuccess("Repair bill sent to the customer for payment.");
    } catch (requestError) { showError(requestError, "Could not approve repair pricing."); }
  }

  async function submitPayment(event) {
    event.preventDefault();
    try {
      const formData = new FormData();
      formData.append("proofOfPayment", paymentProof);
      const { data } = await api.patch(`/service-tickets/${id}/payment-proof`, formData);
      setTicket(data);
      showSuccess("GCash proof submitted. The owner will verify it before pickup.");
    } catch (requestError) { showError(requestError, "Could not submit payment proof."); }
  }

  async function recordPayment(paymentMethod) {
    try {
      const { data } = await api.patch(`/service-tickets/${id}/record-payment`, { paymentMethod });
      setTicket(data);
      showSuccess("Payment confirmed. The repaired item is ready for pickup.");
    } catch (requestError) { showError(requestError, "Could not confirm payment."); }
  }

  async function completeTicket() {
    try {
      const { data } = await api.patch(`/service-tickets/${id}/complete`, {});
      setTicket(data);
      showSuccess("Repair ticket completed and item marked as returned to the customer.");
    } catch (requestError) { showError(requestError, "Could not complete the ticket."); }
  }

  function printRepairDocument(type) {
    setPrintDocument(type);
    window.setTimeout(() => {
      window.print();
      setPrintDocument(null);
    }, 100);
  }

  const isOwner = user?.role === "OWNER" || user?.role === "STAFF";
  const isGunsmith = user?.role === "GUNSMITH";
  const isCustomer = user?.role === "CUSTOMER";
  const currentStage = ticket ? stageByStatus[ticket.status] ?? 0 : 0;
  const receiptAvailable = ticket && ["PAID_READY_FOR_PICKUP", "COMPLETED"].includes(ticket.status);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Link to="/repairs" className="text-sm text-amber hover:text-amber/70">← Back to repair tickets</Link>
        {error && <div className="bg-warning/15 border border-warning/60 text-warning rounded-card px-4 py-3 mt-5 text-sm">{error}</div>}
        {success && <div className="bg-olive/15 border border-olive/60 text-olive rounded-card px-4 py-3 mt-5 text-sm">{success}</div>}
        {!ticket && !error && <p className="text-gray-500 text-sm mt-6">Loading ticket...</p>}

        {ticket && (
          <div className="mt-5 space-y-6">
            <section className="bg-panel border border-gray-700 rounded-card overflow-hidden">
              <div className="p-6 flex flex-wrap justify-between items-start gap-4 border-b border-gray-700">
                <div><p className="text-xs text-amber font-mono-data tracking-wider mb-2">SERVICE TICKET</p><h1 className="font-heading text-2xl">#SVC-{ticket.id} · {ticket.unitType}</h1><p className="text-xs text-gray-500 mt-2">Created {formatDate(ticket.createdAt)}</p></div>
                <span className="px-3 py-1.5 rounded-pill bg-amber/20 text-amber text-[10px] font-bold uppercase tracking-wider">{statusLabels[ticket.status] ?? ticket.status.replaceAll("_", " ")}</span>
              </div>

              <div className="grid md:grid-cols-2 gap-5 p-6">
                <div className="flex flex-col"><h2 className="text-xs text-gray-500 mb-2">ITEM & CUSTOMER</h2><div className="flex-1 bg-gunmetal rounded-card p-4 text-sm space-y-3"><div><p className="text-xs text-gray-500">Item being repaired</p><p>{ticket.unitType}</p></div><div><p className="text-xs text-gray-500">Customer</p><p>{ticket.customer?.name} {ticket.customer?.phone ? `· ${ticket.customer.phone}` : ""}</p></div><div><p className="text-xs text-gray-500">Assigned on-call gunsmith</p><p>{ticket.gunsmith?.name ?? "Awaiting assignment"}</p></div></div></div>
                <div className="flex flex-col"><h2 className="text-xs text-gray-500 mb-2">REPORTED ISSUE</h2><div className="flex-1 bg-gunmetal rounded-card p-4 text-sm"><p>{ticket.issueReported}</p>{ticket.intakeNotes && <div className="border-t border-gray-700 mt-3 pt-3"><p className="text-xs text-gray-500 mb-1">Intake notes</p><p className="text-gray-300">{ticket.intakeNotes}</p></div>}</div></div>
              </div>
            </section>

            <section className="bg-panel border border-gray-700 rounded-card p-6">
              <h2 className="font-heading text-lg mb-5">Repair progress</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {STAGES.map((stage, index) => {
                  const done = currentStage > index || ticket.status === "COMPLETED";
                  const active = currentStage === index && ticket.status !== "COMPLETED";
                  return <div key={stage.key} className={`rounded-card p-3 border ${active ? "border-amber bg-amber/10" : done ? "border-olive/50 bg-olive/5" : "border-gray-700 bg-gunmetal"}`}><div className="flex items-center gap-3"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? "bg-olive text-gunmetal" : active ? "bg-amber text-gunmetal" : "bg-gray-700 text-gray-500"}`}>{done ? "✓" : index + 1}</span><p className={`text-xs ${done || active ? "text-white" : "text-gray-500"}`}>{stage.label}</p></div></div>;
                })}
              </div>
            </section>

            {isGunsmith && ticket.status === "AWAITING_GUNSMITH" && <section className="bg-panel border border-amber/50 rounded-card p-6"><h2 className="font-heading text-xl">Assigned repair is ready</h2><p className="text-sm text-gray-400 mt-2 mb-4">Start the repair when you arrive at the shop and begin working on the item.</p><button onClick={startRepair} className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Start repair</button></section>}

            {isGunsmith && ticket.status === "IN_REPAIR" && (
              <form onSubmit={submitWork} className="bg-panel border border-amber/50 rounded-card p-6 space-y-5">
                <div><h2 className="font-heading text-xl">Gunsmith work log</h2><p className="text-sm text-gray-400 mt-1">Classify the labor and record every shop part installed in the customer&apos;s item.</p></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className={`border rounded-card p-4 cursor-pointer ${workForm.complexity === "SIMPLE" ? "border-amber bg-amber/10" : "border-gray-700"}`}><input type="radio" className="mr-2" checked={workForm.complexity === "SIMPLE"} onChange={() => setWorkForm({ ...workForm, complexity: "SIMPLE" })} /><span className="font-semibold">Simple repair</span><p className="text-xs text-gray-400 mt-2">Owner adjusts the labor amount for this ticket.</p></label>
                  <label className={`border rounded-card p-4 cursor-pointer ${workForm.complexity === "COMPLEX" ? "border-amber bg-amber/10" : "border-gray-700"}`}><input type="radio" className="mr-2" checked={workForm.complexity === "COMPLEX"} onChange={() => setWorkForm({ ...workForm, complexity: "COMPLEX" })} /><span className="font-semibold">Complex repair</span><p className="text-xs text-gray-400 mt-2">Fixed labor: <Money value={repairSettings.complexLaborPrice} className="text-amber" /></p></label>
                </div>
                <label className="text-xs text-gray-400 block">Work performed *<textarea required rows="4" value={workForm.workPerformed} onChange={(event) => setWorkForm({ ...workForm, workPerformed: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="Describe the diagnosis and repair work completed" /></label>

                <div>
                  <div className="flex justify-between items-center gap-4 mb-3"><div><h3 className="font-heading text-base">Shop parts used</h3><p className="text-xs text-gray-500">Leave empty if no parts were needed.</p></div><button type="button" onClick={addPart} className="text-xs text-amber font-bold">+ Add part</button></div>
                  <div className="space-y-3">
                    {workForm.partsUsed.map((part, index) => (
                      <div key={index} className="grid sm:grid-cols-[1fr_110px_auto] gap-3 bg-gunmetal rounded-card p-3">
                        <label className="text-xs text-gray-400">Part<select required value={part.productId} onChange={(event) => updatePart(index, "productId", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm"><option value="">Select shop inventory</option>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name} ({product.quantity} available)</option>)}</select></label>
                        <label className="text-xs text-gray-400">Quantity<input required min="1" type="number" value={part.quantity} onChange={(event) => updatePart(index, "quantity", event.target.value)} className="mt-1 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm" /></label>
                        <button type="button" onClick={() => removePart(index)} className="self-end py-2 text-xs text-warning font-semibold">Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
                <label className="text-xs text-gray-400 block">Internal gunsmith notes<textarea rows="2" value={workForm.gunsmithNotes} onChange={(event) => setWorkForm({ ...workForm, gunsmithNotes: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm" placeholder="Optional notes for the owner" /></label>
                <div className="flex flex-wrap justify-between items-center gap-3 border-t border-gray-700 pt-4"><p className="text-xs text-warning">Submitting deducts the listed parts from shop stock.</p><button className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Submit work to owner</button></div>
              </form>
            )}

            {ticket.workPerformed && (
              <section className="bg-panel border border-gray-700 rounded-card p-6">
                <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-heading text-xl">Gunsmith work summary</h2><p className="text-xs text-gray-500 mt-1">Submitted {formatDate(ticket.workSubmittedAt)}</p></div><span className="h-fit px-3 py-1 rounded-pill bg-amber/20 text-amber text-[10px] font-bold">{ticket.complexity} LABOR</span></div>
                <p className="text-sm mt-4 bg-gunmetal rounded-card p-4">{ticket.workPerformed}</p>
                {ticket.gunsmithNotes && <p className="text-xs text-gray-400 mt-3">Gunsmith note: {ticket.gunsmithNotes}</p>}
                <div className="mt-5"><h3 className="text-xs text-gray-500 mb-2">PARTS INSTALLED FROM SHOP INVENTORY</h3>{ticket.partsUsed.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gunmetal text-xs text-gray-400"><tr><th className="text-left px-4 py-2">Part</th><th className="text-right px-4 py-2">Qty</th><th className="text-right px-4 py-2">Shop price</th><th className="text-right px-4 py-2">Total</th></tr></thead><tbody>{ticket.partsUsed.map((part) => <tr key={part.id} className="border-t border-gray-800"><td className="px-4 py-3"><p>{part.name}</p><p className="text-[10px] text-gray-500 font-mono-data">{part.sku}</p></td><td className="text-right px-4 py-3">{part.quantity}</td><td className="text-right px-4 py-3"><Money value={part.unitPrice} /></td><td className="text-right px-4 py-3 text-amber"><Money value={part.lineTotal} /></td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-400 bg-gunmetal rounded-card p-3">No shop parts were used for this repair.</p>}</div>
              </section>
            )}

            {isOwner && ticket.status === "AWAITING_OWNER_PRICING" && (
              <form onSubmit={approvePrice} className="bg-panel border border-amber/50 rounded-card p-6">
                <h2 className="font-heading text-xl">Owner pricing approval</h2><p className="text-sm text-gray-400 mt-1 mb-5">Parts are charged at shop price. Labor goes entirely to the on-call gunsmith.</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-gunmetal rounded-card p-4"><p className="text-xs text-gray-500">PARTS CHARGED BY SHOP</p><p className="text-lg text-amber font-bold mt-2"><Money value={ticket.partsTotal} /></p></div>
                  <div className="bg-gunmetal rounded-card p-4"><p className="text-xs text-gray-500">LABOR TYPE</p><p className="text-lg font-bold mt-2">{ticket.complexity}</p></div>
                  <div className="bg-gunmetal rounded-card p-4"><p className="text-xs text-gray-500">GUNSMITH LABOR</p>{ticket.complexity === "COMPLEX" ? <p className="text-lg text-olive font-bold mt-2"><Money value={repairSettings.complexLaborPrice} /></p> : <input required min="0" type="number" value={simpleLaborPrice} onChange={(event) => setSimpleLaborPrice(event.target.value)} className="mt-2 w-full bg-panel border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" placeholder="Enter simple labor price" />}</div>
                </div>
                <div className="flex justify-end mt-4"><button className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Set price and send bill</button></div>
              </form>
            )}

            {ticket.totalPrice > 0 && (
              <section className="bg-panel border border-gray-700 rounded-card p-6">
                <h2 className="font-heading text-xl mb-4">Customer repair bill</h2>
                <div className="max-w-md space-y-3 text-sm"><div className="flex justify-between"><span className="text-gray-400">Shop parts</span><Money value={ticket.partsTotal} /></div><div className="flex justify-between"><span className="text-gray-400">Gunsmith labor</span><Money value={ticket.laborPrice} /></div><div className="flex justify-between border-t border-gray-700 pt-3 text-lg font-bold"><span>Total due</span><Money value={ticket.totalPrice} className="text-amber" /></div></div>
                {(isOwner || isGunsmith) && <div className="grid sm:grid-cols-2 gap-3 mt-5"><div className="bg-olive/10 border border-olive/40 rounded-card p-3"><p className="text-xs text-gray-400">GUNSMITH PAYOUT · LABOR ONLY</p><p className="text-olive font-bold mt-1"><Money value={ticket.gunsmithPayout} /></p></div><div className="bg-amber/10 border border-amber/40 rounded-card p-3"><p className="text-xs text-gray-400">SHOP PARTS REVENUE</p><p className="text-amber font-bold mt-1"><Money value={ticket.shopPartsRevenue} /></p></div></div>}
                {(isOwner || isCustomer) && <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-gray-700"><button onClick={() => printRepairDocument("invoice")} className="border border-gray-700 rounded-card px-4 py-2 text-xs font-bold hover:border-amber hover:text-amber">Print repair invoice</button>{receiptAvailable && <button onClick={() => printRepairDocument("receipt")} className="bg-olive text-gunmetal rounded-card px-4 py-2 text-xs font-bold hover:bg-olive/80">Print customer receipt</button>}</div>}
              </section>
            )}

            {isCustomer && ticket.status === "AWAITING_PAYMENT" && (
              <section className="grid md:grid-cols-2 gap-4">
                <div className="bg-panel border border-gray-700 rounded-card p-5"><h2 className="font-heading text-lg">Pay at the store</h2><p className="text-sm text-gray-400 mt-2">Pay <Money value={ticket.totalPrice} className="text-amber" /> at the counter. The owner will record your payment and prepare the item for pickup.</p></div>
                <form onSubmit={submitPayment} className="bg-panel border border-amber/50 rounded-card p-5"><h2 className="font-heading text-lg">Pay through GCash QR</h2><div className="my-3 bg-white text-gunmetal rounded-card h-28 flex flex-col items-center justify-center"><p className="font-heading text-xl">GCASH QR</p><p className="text-xs">Store demo payment code</p></div><p className="text-xs text-gray-400 mb-3">{repairSettings.gcashInstructions}</p><input required type="file" accept="image/*" onChange={(event) => setPaymentProof(event.target.files?.[0] ?? null)} className="w-full text-xs text-gray-400 mb-3" /><button className="w-full bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Submit GCash proof</button></form>
              </section>
            )}

            {isOwner && ticket.status === "AWAITING_PAYMENT" && <section className="bg-panel border border-amber/50 rounded-card p-6 flex flex-wrap justify-between items-center gap-4"><div><h2 className="font-heading text-lg">Awaiting customer payment</h2><p className="text-sm text-gray-400 mt-1">If the customer pays at the counter, record the payment here.</p></div><button onClick={() => recordPayment("IN_STORE")} className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Record paid at store</button></section>}

            {isOwner && ticket.status === "PAYMENT_SUBMITTED" && <section className="bg-panel border border-amber/50 rounded-card p-6 flex flex-wrap justify-between items-center gap-4"><div><h2 className="font-heading text-lg">Verify GCash payment</h2><p className="text-sm text-gray-400 mt-1">Proof file: <span className="text-white">{ticket.paymentProof}</span></p></div><button onClick={() => recordPayment("GCASH")} className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Confirm GCash payment</button></section>}

            {ticket.status === "PAID_READY_FOR_PICKUP" && <section className="bg-olive/10 border border-olive rounded-card p-6 flex flex-wrap justify-between items-center gap-4"><div><h2 className="font-heading text-xl text-olive">Paid and ready for pickup</h2><p className="text-sm text-gray-300 mt-1">Payment method: {ticket.paymentMethod === "GCASH" ? "GCash" : "In store"} · Confirmed {formatDate(ticket.paidAt)}</p></div>{isOwner && <button onClick={completeTicket} className="bg-olive text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Mark item returned</button>}</section>}

            {ticket.status === "COMPLETED" && <section className="bg-panel border border-gray-700 rounded-card p-6 text-center"><p className="font-heading text-2xl text-olive">Repair completed</p><p className="text-sm text-gray-400 mt-2">The repaired item was returned to the customer on {formatDate(ticket.completedAt)}.</p></section>}
          </div>
        )}
      </main>
      {ticket && printDocument && <RepairPrintDocument ticket={ticket} type={printDocument} />}
    </div>
  );
}
