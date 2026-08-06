import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function load() {
    api.get("/customers").then((response) => setCustomers(response.data)).catch(() => setError("Could not load customer records."));
  }

  useEffect(() => {
    const token = localStorage.getItem("onedepot_token");
    if (!token) return navigate("/login");
    try {
      const user = JSON.parse(atob(token.split(".")[1]));
      if (!["OWNER", "STAFF"].includes(user.role)) return navigate("/");
      load();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/customers", form);
      setForm({ name: "", email: "", phone: "" });
      setShowForm(false);
      load();
    } catch (requestError) {
      setError(requestError.response?.data?.error ?? "Could not save customer record.");
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-start gap-4 mb-7">
          <div><p className="text-xs text-amber tracking-widest font-mono-data mb-2">CUSTOMER DIRECTORY</p><h1 className="font-heading text-3xl">Customer records</h1><p className="text-sm text-gray-400 mt-2">Add customers before logging their repair tickets.</p></div>
          <button onClick={() => setShowForm((open) => !open)} className="bg-amber text-gunmetal rounded-card px-4 py-2 text-sm font-semibold">{showForm ? "Cancel" : "Add customer"}</button>
        </div>
        {error && <p className="text-warning text-sm mb-4">{error}</p>}
        {showForm && <form onSubmit={submit} className="bg-panel border border-gray-700 rounded-card p-5 mb-6 grid md:grid-cols-3 gap-4">
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Customer name" className="bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" />
          <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" className="bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" />
          <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Contact number" className="bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber" />
          <button className="md:col-span-3 justify-self-start bg-white text-gunmetal rounded-card px-4 py-2 text-sm font-semibold">Save customer record</button>
        </form>}
        <div className="bg-panel border border-gray-700 rounded-card overflow-hidden">
          <table className="w-full text-sm"><thead className="bg-gunmetal text-gray-400 text-xs"><tr><th className="text-left px-5 py-3">Customer</th><th className="text-left px-5 py-3">Email</th><th className="text-left px-5 py-3">Contact</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-t border-gray-800"><td className="px-5 py-3">{customer.name}</td><td className="px-5 py-3 text-gray-400">{customer.email}</td><td className="px-5 py-3 text-gray-400">{customer.phone || "-"}</td></tr>)}</tbody></table>
          {customers.length === 0 && <p className="p-5 text-sm text-gray-400">No customer records yet.</p>}
        </div>
      </main>
    </div>
  );
}
