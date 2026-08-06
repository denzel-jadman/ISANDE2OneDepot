import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

const statusInfo = {
  AWAITING_GUNSMITH: { label: "Awaiting gunsmith", className: "bg-amber/20 text-amber" },
  IN_REPAIR: { label: "Repair in progress", className: "bg-amber/20 text-amber" },
  AWAITING_OWNER_PRICING: { label: "Awaiting owner pricing", className: "bg-warning/20 text-warning" },
  AWAITING_PAYMENT: { label: "Awaiting customer payment", className: "bg-warning/20 text-warning" },
  PAYMENT_SUBMITTED: { label: "Payment proof submitted", className: "bg-amber/20 text-amber" },
  PAID_READY_FOR_PICKUP: { label: "Paid · ready for pickup", className: "bg-olive/20 text-olive" },
  COMPLETED: { label: "Completed", className: "bg-gray-700 text-gray-300" },
};

export default function Repairs() {
  const [tickets, setTickets] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customerId: "", unitType: "", issueReported: "", intakeNotes: "" });
  const [repairSettings, setRepairSettings] = useState({ complexLaborPrice: 1500, gcashInstructions: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  function load() {
    Promise.all([api.get("/service-tickets"), api.get("/repair-settings")])
      .then(([ticketsResponse, settingsResponse]) => {
        setTickets(ticketsResponse.data);
        setRepairSettings(settingsResponse.data);
        setError("");
      })
      .catch(() => setError("Please log in to view repair tickets."));
  }

  useEffect(() => {
    const token = localStorage.getItem("onedepot_token");
    if (!token) { navigate("/login"); return; }
    try {
      const signedInUser = JSON.parse(atob(token.split(".")[1]));
      setUser(signedInUser);
      load();
      if (["OWNER", "STAFF"].includes(signedInUser.role)) api.get("/service-tickets/customers").then((response) => setCustomers(response.data));
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  async function createTicket(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    try {
      const { data } = await api.post("/service-tickets", form);
      navigate(`/repairs/${data.id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not create repair ticket.");
    }
  }

  async function saveRepairSettings(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    try {
      const { data } = await api.patch("/repair-settings", repairSettings);
      setRepairSettings(data);
      setSuccess("Repair pricing and GCash instructions updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not update repair pricing.");
    }
  }

  const isGunsmith = user?.role === "GUNSMITH";
  const isCustomer = user?.role === "CUSTOMER";
  const canCreateTickets = ["OWNER", "STAFF"].includes(user?.role);
  const awaitingAction = tickets.filter((ticket) => {
    if (isGunsmith) return ["AWAITING_GUNSMITH", "IN_REPAIR"].includes(ticket.status);
    if (isCustomer) return ["AWAITING_PAYMENT", "PAID_READY_FOR_PICKUP"].includes(ticket.status);
    return ["AWAITING_OWNER_PRICING", "PAYMENT_SUBMITTED", "PAID_READY_FOR_PICKUP"].includes(ticket.status);
  }).length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-7">
          <div>
            <p className="text-xs text-amber tracking-widest font-mono-data mb-2">REPAIR CENTER</p>
            <h1 className="font-heading text-3xl">{isGunsmith ? "On-call gunsmith workbench" : isCustomer ? "My repair tickets" : "Repair operations"}</h1>
            <p className="text-sm text-gray-400 mt-2">{isGunsmith ? "Log your work and the shop parts used for each assigned repair." : isCustomer ? "Review your repair progress, bill, and payment options." : "Manage repair intake, pricing, payment, and pickup."}</p>
          </div>
          {canCreateTickets && <button onClick={() => setShowForm((open) => !open)} className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">{showForm ? "Cancel" : "+ Create repair ticket"}</button>}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-panel border border-gray-700 rounded-card p-4"><p className="text-xs text-gray-500">TOTAL TICKETS</p><p className="font-heading text-2xl mt-1">{tickets.length}</p></div>
          <div className="bg-panel border border-gray-700 rounded-card p-4"><p className="text-xs text-gray-500">NEEDS YOUR ACTION</p><p className="font-heading text-2xl mt-1 text-amber">{awaitingAction}</p></div>
          <div className="bg-panel border border-gray-700 rounded-card p-4"><p className="text-xs text-gray-500">COMPLETED</p><p className="font-heading text-2xl mt-1 text-olive">{tickets.filter((ticket) => ticket.status === "COMPLETED").length}</p></div>
        </div>

        {error && <div className="bg-warning/15 border border-warning/60 text-warning rounded-card px-4 py-3 mb-6 text-sm">{error}</div>}
        {success && <div className="bg-olive/15 border border-olive/60 text-olive rounded-card px-4 py-3 mb-6 text-sm">{success}</div>}

        {user?.role === "OWNER" && (
          <form onSubmit={saveRepairSettings} className="bg-panel border border-gray-700 rounded-card p-5 mb-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="font-heading text-lg">Repair pricing settings</h2><p className="text-xs text-gray-400 mt-1">Complex repair labor is fixed. Simple repair labor is entered per ticket.</p></div>
              <button className="bg-white text-gunmetal rounded-card px-4 py-2 text-xs font-bold">Save settings</button>
            </div>
            <div className="grid md:grid-cols-[240px_1fr] gap-4 mt-4">
              <label className="text-xs text-gray-400">Fixed complex labor price<input min="0" type="number" value={repairSettings.complexLaborPrice} onChange={(event) => setRepairSettings({ ...repairSettings, complexLaborPrice: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" /></label>
              <label className="text-xs text-gray-400">GCash instructions<input value={repairSettings.gcashInstructions} onChange={(event) => setRepairSettings({ ...repairSettings, gcashInstructions: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" /></label>
            </div>
          </form>
        )}

        {showForm && (
          <form onSubmit={createTicket} className="bg-panel border border-gray-700 rounded-card p-5 mb-7 space-y-4">
            <div><h2 className="font-heading text-xl">Customer repair intake</h2><p className="text-xs text-gray-400 mt-1">The owner records the item and reported problem when the customer arrives.</p></div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="text-xs text-gray-400">Customer *<select required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })} className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-amber"><option value="">Select a customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` — ${customer.phone}` : ""}</option>)}</select>{customers.length === 0 && <span className="block text-warning mt-1">Create the customer record first.</span>}</label>
              <label className="text-xs text-gray-400">Item being repaired *<input required value={form.unitType} onChange={(event) => setForm({ ...form, unitType: event.target.value })} placeholder="e.g., GBB pistol — M9 Elite" className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2.5 text-sm focus:outline-none focus:border-amber" /></label>
            </div>
            <label className="text-xs text-gray-400 block">Issue reported by customer *<textarea required value={form.issueReported} onChange={(event) => setForm({ ...form, issueReported: event.target.value })} placeholder="Describe what is wrong with the item" rows="3" className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" /></label>
            <label className="text-xs text-gray-400 block">Intake notes<textarea value={form.intakeNotes} onChange={(event) => setForm({ ...form, intakeNotes: event.target.value })} placeholder="Visible damage, included accessories, condition on arrival" rows="2" className="mt-1 w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" /></label>
            <button className="bg-amber text-gunmetal rounded-card px-4 py-2.5 text-sm font-bold">Create and assign ticket</button>
          </form>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {tickets.map((ticket) => {
            const status = statusInfo[ticket.status] ?? { label: ticket.status?.replaceAll("_", " "), className: "bg-gray-700 text-gray-300" };
            return (
              <article key={ticket.id} className="bg-panel border border-gray-700 rounded-card p-5 hover:border-amber/50 transition-colors">
                <div className="flex justify-between gap-3 mb-3"><div><p className="font-heading text-lg">Service ticket #SVC-{ticket.id}</p><p className="text-xs text-gray-500 mt-1">{ticket.unitType}</p></div><span className={`text-[10px] px-2.5 py-1 rounded-pill h-fit font-bold uppercase ${status.className}`}>{status.label}</span></div>
                <p className="text-sm text-gray-300 mb-4 line-clamp-2">{ticket.issueReported}</p>
                <div className="space-y-1 text-xs text-gray-500 mb-4"><p>Customer: <span className="text-gray-300">{ticket.customer?.name}</span></p><p>Gunsmith: <span className="text-gray-300">{ticket.gunsmith?.name ?? "Awaiting assignment"}</span></p>{ticket.totalPrice > 0 && <p>Total bill: <span className="text-amber font-mono-data">PHP {Number(ticket.totalPrice).toLocaleString()}</span></p>}</div>
                <Link to={`/repairs/${ticket.id}`} className="inline-flex text-sm text-amber font-semibold hover:text-amber/70">Open ticket →</Link>
              </article>
            );
          })}
        </div>
        {tickets.length === 0 && !error && <p className="bg-panel rounded-card p-6 text-sm text-gray-400">No repair tickets yet.</p>}
      </main>
    </div>
  );
}
