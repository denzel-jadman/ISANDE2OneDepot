import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";

import api from "../api.js";

const DELIVERY_FEE = 120;

export default function Cart() {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("onedepot_cart") || "[]"));
  const [stockLoaded, setStockLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/products")
      .then(({ data: products }) => {
        const stockByProductId = new Map(products.map((product) => [product.id, Number(product.quantity)]));
        setCart((current) => {
          const next = current
            .map((item) => {
              const availableQuantity = stockByProductId.get(item.productId) ?? 0;
              return { ...item, availableQuantity, quantity: Math.min(item.quantity, availableQuantity) };
            })
            .filter((item) => item.quantity > 0);
          localStorage.setItem("onedepot_cart", JSON.stringify(next));
          return next;
        });
      })
      .finally(() => setStockLoaded(true));
  }, []);

  function updateQty(productId, delta) {
    const next = cart
      .map((i) => {
        if (i.productId !== productId) return i;
        return { ...i, quantity: Math.min(i.quantity + delta, i.availableQuantity ?? i.quantity) };
      })
      .filter((i) => i.quantity > 0);
    setCart(next);
    localStorage.setItem("onedepot_cart", JSON.stringify(next));
  }

  const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const total = cart.length ? subtotal + DELIVERY_FEE : 0;

  return (
    <div className="min-h-screen">
      <Navbar cartCount={cart.reduce((s, i) => s + i.quantity, 0)} />
      <main className="max-w-md mx-auto px-6 py-10">
        <div className="bg-panel rounded-card p-5">
          <div className="flex justify-between mb-4">
            <h1 className="font-heading text-lg">Your cart</h1>
            <span className="text-gray-400 text-sm">{cart.length} items</span>
          </div>

          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between items-center bg-gunmetal rounded-card p-3 mb-3">
              <div>
                <p className="text-sm">{item.name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQty(item.productId, -1)}
                    className="w-6 h-6 rounded-card bg-panel text-sm"
                  >
                    −
                  </button>
                  <span className="text-sm font-mono-data">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.productId, 1)}
                    disabled={!stockLoaded || item.quantity >= item.availableQuantity}
                    title={item.quantity >= item.availableQuantity ? "Maximum available stock reached" : "Increase quantity"}
                    className="w-6 h-6 rounded-card bg-panel text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="text-amber font-mono-data text-sm">
                ₱{(Number(item.price) * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}

          {cart.length === 0 && <p className="text-gray-500 text-sm">Your cart is empty.</p>}

          <div className="border-t border-gray-700 mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span className="font-mono-data">₱{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Delivery fee (Maxim)</span>
              <span className="font-mono-data">₱{cart.length ? DELIVERY_FEE : 0}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2">
              <span>Total</span>
              <span className="text-amber font-mono-data">₱{total.toLocaleString()}</span>
            </div>
          </div>

          <button
            disabled={!cart.length}
            onClick={() => navigate("/checkout")}
            className="w-full bg-amber text-gunmetal font-semibold rounded-card py-2.5 mt-5 text-sm disabled:opacity-40"
          >
            Proceed to checkout
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full border border-gray-700 rounded-card py-2.5 mt-2 text-sm hover:border-amber"
          >
            Continue shopping
          </button>
        </div>
      </main>
    </div>
  );
}
