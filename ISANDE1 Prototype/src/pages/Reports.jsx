import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

const statusLabel = (status) => status === "COMPLETED" ? "Completed order" : status.replaceAll("_", " ");

export default function Reports() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("onedepot_token");
    if (!token) return navigate("/login");
    try {
      const user = JSON.parse(atob(token.split(".")[1]));
      if (!["OWNER", "STAFF"].includes(user.role)) return navigate("/");
      Promise.all([api.get("/orders"), api.get("/products")])
        .then(([orderResponse, productResponse]) => {
          setOrders(orderResponse.data);
          setProducts(productResponse.data);
        })
        .catch(() => setError("Could not generate the report."));
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const report = useMemo(() => {
    const confirmedOrders = orders.filter((order) => ["PREPARING", "OUT_FOR_DELIVERY", "COMPLETED"].includes(order.status));
    const grossSales = confirmedOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const pendingOrders = orders.filter((order) => ["PENDING_PAYMENT", "PENDING_VERIFICATION"].includes(order.status));
    const lowStock = products.filter((product) => product.quantity <= product.lowStockAt);
    const productSales = new Map();
    confirmedOrders.forEach((order) => order.items.forEach((item) => {
      const current = productSales.get(item.productId) ?? { name: item.product?.name ?? "Product", quantity: 0, gross: 0 };
      current.quantity += item.quantity;
      current.gross += Number(item.unitPrice) * item.quantity;
      productSales.set(item.productId, current);
    }));
    const topProducts = [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    return { grossSales, confirmedOrders, pendingOrders, lowStock, topProducts };
  }, [orders, products]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10 report-print-area">
        <div className="flex justify-between items-start gap-5 mb-8 print:mb-5">
          <div>
            <p className="text-xs text-amber tracking-widest font-mono-data mb-2">BUSINESS OVERVIEW</p>
            <h1 className="font-heading text-3xl">Reports dashboard</h1>
            <p className="text-sm text-gray-400 mt-2">Generated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <button onClick={() => window.print()} className="bg-amber text-gunmetal rounded-card px-4 py-2 text-sm font-semibold print:hidden">Print report</button>
        </div>

        {error && <p className="text-warning text-sm">{error}</p>}
        {!error && <>
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-panel border border-gray-700 rounded-card p-5"><p className="text-xs text-gray-400">TOTAL ORDERS</p><p className="font-heading text-3xl mt-2">{orders.length}</p><p className="text-xs text-gray-500 mt-1">All recorded orders</p></div>
            <div className="bg-panel border border-gray-700 rounded-card p-5"><p className="text-xs text-gray-400">TOTAL GROSS SALES</p><p className="font-heading text-3xl text-amber mt-2">PHP {report.grossSales.toLocaleString()}</p><p className="text-xs text-gray-500 mt-1">Confirmed, preparing, and completed</p></div>
            <div className="bg-panel border border-gray-700 rounded-card p-5"><p className="text-xs text-gray-400">ACTIVE FULFILLMENT</p><p className="font-heading text-3xl mt-2">{report.confirmedOrders.filter((order) => order.status !== "COMPLETED").length}</p><p className="text-xs text-gray-500 mt-1">Preparing or out for delivery</p></div>
            <div className="bg-panel border border-gray-700 rounded-card p-5"><p className="text-xs text-gray-400">LOW STOCK ITEMS</p><p className="font-heading text-3xl text-warning mt-2">{report.lowStock.length}</p><p className="text-xs text-gray-500 mt-1">At or below alert level</p></div>
          </section>

          <section className="grid lg:grid-cols-2 gap-5 mb-6">
            <div className="bg-panel border border-gray-700 rounded-card p-5">
              <h2 className="font-heading text-lg mb-1">Order status</h2><p className="text-xs text-gray-500 mb-4">Current order pipeline</p>
              <div className="space-y-3">
                {["PENDING_PAYMENT", "PENDING_VERIFICATION", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "REJECTED"].map((status) => {
                  const count = orders.filter((order) => order.status === status).length;
                  const percent = orders.length ? Math.round((count / orders.length) * 100) : 0;
                  return <div key={status}><div className="flex justify-between text-sm mb-1"><span>{statusLabel(status)}</span><span className="font-mono-data text-gray-400">{count}</span></div><div className="h-2 bg-gunmetal rounded-pill overflow-hidden"><div className="h-full bg-amber rounded-pill" style={{ width: `${percent}%` }} /></div></div>;
                })}
              </div>
            </div>

            <div className="bg-panel border border-gray-700 rounded-card p-5">
              <h2 className="font-heading text-lg mb-1">Top-selling products</h2><p className="text-xs text-gray-500 mb-4">Based on confirmed orders</p>
              {report.topProducts.length ? <div className="space-y-3">{report.topProducts.map((product, index) => <div key={product.name} className="flex justify-between gap-4 border-b border-gray-800 pb-3 last:border-0"><div><p className="text-sm"><span className="text-amber font-mono-data mr-2">0{index + 1}</span>{product.name}</p><p className="text-xs text-gray-500 mt-1">{product.quantity} units sold</p></div><span className="font-mono-data text-sm text-amber">PHP {product.gross.toLocaleString()}</span></div>)}</div> : <p className="text-sm text-gray-400">No confirmed sales yet.</p>}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-5">
            <div className="bg-panel border border-gray-700 rounded-card p-5"><h2 className="font-heading text-lg mb-4">Orders awaiting action</h2>{report.pendingOrders.length ? <div className="space-y-2">{report.pendingOrders.map((order) => <div key={order.id} className="flex justify-between bg-gunmetal rounded-card px-3 py-2 text-sm"><span>#ORD-{order.id} · {order.customer?.name ?? "Customer"}</span><span className="text-amber">{statusLabel(order.status)}</span></div>)}</div> : <p className="text-sm text-gray-400">No orders awaiting payment action.</p>}</div>
            <div className="bg-panel border border-gray-700 rounded-card p-5"><h2 className="font-heading text-lg mb-4">Low-stock inventory</h2>{report.lowStock.length ? <div className="space-y-2">{report.lowStock.map((product) => <div key={product.id} className="flex justify-between bg-gunmetal rounded-card px-3 py-2 text-sm"><span>{product.name}</span><span className="text-warning font-mono-data">{product.quantity} left</span></div>)}</div> : <p className="text-sm text-gray-400">Inventory levels are healthy.</p>}</div>
          </section>
        </>}
      </main>
    </div>
  );
}
