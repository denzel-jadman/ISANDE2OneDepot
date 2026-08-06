import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";
import { categoryGroups } from "../constants/categories.js";

function WaitlistView({ entries, loading }) {
  const requestedProducts = new Set(entries.map((entry) => entry.productId)).size;
  if (loading) return <div className="bg-panel border border-gray-700 rounded-card px-6 py-8 text-center text-gray-400">Loading waitlist...</div>;
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-panel border border-gray-700 rounded-card p-5"><p className="text-xs text-gray-500">WAITING CUSTOMERS</p><p className="font-heading text-3xl mt-2 text-amber">{entries.length}</p></div>
        <div className="bg-panel border border-gray-700 rounded-card p-5"><p className="text-xs text-gray-500">PRODUCTS IN DEMAND</p><p className="font-heading text-3xl mt-2">{requestedProducts}</p></div>
      </div>
      <div className="bg-panel rounded-card border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700"><h2 className="font-heading text-lg">Active customer waitlist</h2><p className="text-xs text-gray-500 mt-1">Customers are removed after the product is restocked and their notification is created.</p></div>
        {entries.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gunmetal border-b border-gray-700"><tr><th className="px-5 py-3 text-left text-xs text-gray-400">Customer</th><th className="px-5 py-3 text-left text-xs text-gray-400">Contact</th><th className="px-5 py-3 text-left text-xs text-gray-400">Requested product</th><th className="px-5 py-3 text-right text-xs text-gray-400">Current stock</th><th className="px-5 py-3 text-right text-xs text-gray-400">Joined</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-b border-gray-800"><td className="px-5 py-4 font-semibold">{entry.customer.name}</td><td className="px-5 py-4 text-gray-400"><p>{entry.customer.email}</p>{entry.customer.phone && <p className="text-xs mt-1">{entry.customer.phone}</p>}</td><td className="px-5 py-4"><p>{entry.product.name}</p><p className="text-[10px] text-gray-500 font-mono-data mt-1">{entry.product.sku}</p></td><td className="px-5 py-4 text-right"><span className={`px-2 py-1 rounded text-xs font-bold ${Number(entry.product.quantity) > 0 ? "bg-olive/20 text-olive" : "bg-warning/20 text-warning"}`}>{entry.product.quantity}</span></td><td className="px-5 py-4 text-right text-xs text-gray-500">{new Date(entry.addedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="px-6 py-10 text-center"><p className="font-heading text-xl">No customers are waiting</p><p className="text-sm text-gray-400 mt-2">Out-of-stock product requests will appear here.</p></div>}
      </div>
    </div>
  );
}

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [activeView, setActiveView] = useState("products");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", category: "", price: "", quantity: "", lowStockAt: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("onedepot_token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (!(payload.role === "OWNER" || payload.role === "STAFF")) {
        navigate("/");
        return;
      }
    } catch (err) {
      console.error("Invalid token", err);
      navigate("/");
      return;
    }

    fetchProducts();
  }, [navigate]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const [productsResponse, waitlistResponse] = await Promise.all([api.get("/products"), api.get("/waitlist")]);
      setProducts(productsResponse.data);
      setWaitlist(waitlistResponse.data);
    } catch (err) {
      setError("Failed to load products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.sku || !form.name || !form.price) {
      setError("SKU, name, and price are required");
      return;
    }

    try {
      const payload = {
        sku: form.sku,
        name: form.name,
        category: form.category || null,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity) || 0,
        lowStockAt: parseInt(form.lowStockAt) || 5,
      };

      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
      } else {
        await api.post("/products", payload);
      }

      resetForm();
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error ?? "Something went wrong");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      setError("Failed to delete product");
    }
  }

  function editProduct(product) {
    setEditing(product);
    setForm({
      sku: product.sku,
      name: product.name,
      category: product.category || "",
      price: product.price,
      quantity: product.quantity,
      lowStockAt: product.lowStockAt,
    });
    setShowForm(true);
  }

  function resetForm() {
    setForm({ sku: "", name: "", category: "", price: "", quantity: "", lowStockAt: "" });
    setEditing(null);
    setShowForm(false);
    setError("");
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-heading text-3xl mb-2">Product Management</h1>
            <p className="text-gray-400 text-sm">Add, edit, and manage inventory</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={() => setActiveView("products")} className={`px-4 py-2 rounded-card text-sm font-semibold border ${activeView === "products" ? "bg-white text-gunmetal border-white" : "border-gray-700 text-gray-300 hover:border-amber"}`}>Products</button>
            <button onClick={() => { setActiveView("waitlist"); setShowForm(false); }} className={`px-4 py-2 rounded-card text-sm font-semibold border ${activeView === "waitlist" ? "bg-white text-gunmetal border-white" : "border-gray-700 text-gray-300 hover:border-amber"}`}>Waitlist {waitlist.length ? `(${waitlist.length})` : ""}</button>
            {activeView === "products" && <button onClick={() => setShowForm(!showForm)} className="bg-amber text-gunmetal px-4 py-2 rounded-card font-semibold text-sm hover:bg-amber/80 transition-colors">{showForm ? "Cancel" : "+ Add Product"}</button>}
          </div>
        </div>

        {error && (
          <div className="bg-warning/20 border border-warning text-warning rounded-card px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {showForm && activeView === "products" && (
          <form onSubmit={handleSubmit} className="bg-panel border border-gray-700 rounded-card p-6 mb-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">SKU *</label>
                <input
                  required
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber disabled:opacity-50"
                  placeholder="e.g., AK47-GB-001"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
                  placeholder="e.g., AK47 Gearbox Assembly"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
                >
                  <option value="">Select a category</option>
                  {categoryGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Price *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Low Stock Alert At</label>
                <input
                  type="number"
                  value={form.lowStockAt}
                  onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })}
                  className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
                  placeholder="5"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-white text-gunmetal px-4 py-2 rounded-card font-semibold text-sm hover:bg-gray-200 transition-colors"
              >
                {editing ? "Update Product" : "Add Product"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-700 text-gray-300 px-4 py-2 rounded-card font-semibold text-sm hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className={`${activeView === "products" ? "" : "hidden"} bg-panel rounded-card border border-gray-700 overflow-hidden`}>
          <div className="px-6 py-4 border-b border-gray-700">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
            />
          </div>

          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              {search ? "No products found" : "No products yet. Add one to get started!"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gunmetal border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Category</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">Price</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">Quantity</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400">Low Stock</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-800 hover:bg-gunmetal/50 transition-colors">
                      <td className="px-6 py-3 text-gray-300 font-mono text-xs">{product.sku}</td>
                      <td className="px-6 py-3 text-gray-100">{product.name}</td>
                      <td className="px-6 py-3 text-gray-400 text-xs">{product.category || "-"}</td>
                      <td className="px-6 py-3 text-right text-gray-100">₱{parseFloat(product.price).toFixed(2)}</td>
                      <td className="px-6 py-3 text-right">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            product.quantity <= product.lowStockAt
                              ? "bg-warning/20 text-warning"
                              : "bg-olive/20 text-olive"
                          }`}
                        >
                          {product.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center text-gray-400 text-xs">{product.lowStockAt}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => editProduct(product)}
                            className="text-amber hover:text-amber/70 transition-colors text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-warning hover:text-warning/70 transition-colors text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${activeView === "products" ? "" : "hidden"} mt-6 text-xs text-gray-500`}>
          Showing {filteredProducts.length} of {products.length} products
        </div>
        {activeView === "waitlist" && <WaitlistView entries={waitlist} loading={loading} />}
      </div>
    </div>
  );
}
