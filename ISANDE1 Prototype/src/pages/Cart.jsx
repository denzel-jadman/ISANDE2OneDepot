import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import BackLink from "../components/BackLink.jsx";
import CheckoutDetails from "../components/CheckoutDetails.jsx";

import { inventoryMode, lastOrderKey } from "../inventoryApi.js";
import { cartStorageKey, fetchShopProducts, readCart } from "../shopCatalog.js";
import { productPhotos, fallbackPhoto } from "../constants/productPhotos.js";

const DELIVERY_FEE = 120;

function syncCart(cart, products) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const changes = [];
  const items = cart.items.flatMap((item) => {
    const product = byId.get(item.productId);
    const availableQuantity = Number(product?.quantity ?? 0);
    const quantity = Math.min(item.quantity, availableQuantity);
    if (inventoryMode) {
      if (!quantity) changes.push(`${item.name} is unavailable and was removed.`);
      else {
        if (quantity < item.quantity) changes.push(`${product.name} was reduced to ${quantity} based on current stock.`);
        if (Number(item.price) !== Number(product.price)) changes.push(`${product.name} has a new price.`);
      }
    }
    if (!quantity) return [];
    return [{
      ...item,
      ...(inventoryMode ? { name: product.name, price: product.price, photoPath: product.photoPath } : {}),
      sku: product?.sku ?? item.sku,
      category: product?.category ?? item.category,
      availableQuantity,
      quantity,
    }];
  });
  return { items, changes: changes.length ? changes : cart.changes };
}

export default function Cart() {
  const [{ items: cart, changes }, setCart] = useState(() => ({ items: readCart(), changes: [] }));
  const [showCheckout, setShowCheckout] = useState(false);
  const [stockState, setStockState] = useState("loading");
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const request = new AbortController();
    fetchShopProducts({ signal: request.signal })
      .then(({ data: products }) => {
        if (request.signal.aborted) return;
        setCart((current) => syncCart(current, products));
        setStockState("ready");
      })
      .catch(() => {
        if (!request.signal.aborted) setStockState("error");
      });
    return () => request.abort();
  }, [refresh]);

  useEffect(() => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  function updateQty(productId, delta) {
    setCart((current) => ({
      ...current,
      items: current.items.map((item) => item.productId === productId
        ? { ...item, quantity: Math.min(item.quantity + delta, item.availableQuantity ?? item.quantity) }
        : item).filter((item) => item.quantity > 0),
    }));
  }

  function removeItem(productId) {
    setCart((current) => ({ ...current, items: current.items.filter((item) => item.productId !== productId) }));
  }

  function checkStock() {
    setStockState("loading");
    setRefresh((value) => value + 1);
  }

  function openPayment(orderKey) {
    localStorage.setItem(lastOrderKey, orderKey);
    localStorage.removeItem(cartStorageKey);
    navigate("/order-status#" + orderKey);
  }

  const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const total = cart.length ? subtotal + DELIVERY_FEE : 0;

  return (
    <div className="min-h-screen">
      <Navbar cartCount={cart.reduce((s, i) => s + i.quantity, 0)} />
      <main className="max-w-xl mx-auto px-5 py-6 sm:py-10">
        <BackLink to={inventoryMode ? "/shop" : "/"}>Back to shop</BackLink>
        <div className="mt-3 bg-panel rounded-card p-5">
          <div className="flex justify-between mb-4">
            <h1 className="font-heading text-3xl">Your cart</h1>
            <span className="text-gray-400 text-sm">{cart.length} items</span>
          </div>

          {stockState === "loading" && <p role="status" className="mb-3 text-sm text-gray-300">Checking stock…</p>}
          {stockState === "error" && <p role="alert" className="mb-3 text-sm text-[#F6A59F]">
            Could not check current stock.{" "}
            <button type="button" className="text-amber underline" onClick={checkStock}>Try again</button>
          </p>}

          {changes.length > 0 && (
            <div role="status" className="mb-4 rounded-card border border-amber/50 p-3 text-sm">
              <p className="font-semibold">We updated your cart</p>
              <ul className="mt-1 list-disc pl-5">{changes.map((message, index) => <li key={index}>{message}</li>)}</ul>
            </div>
          )}
          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between items-start gap-3 bg-gunmetal rounded-card p-3 mb-3">
              <img src={item.photoPath || productPhotos[item.category] || fallbackPhoto} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-card bg-panel object-contain sm:h-16 sm:w-16" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold break-words">{item.name}</p>
                {item.sku && <p className="text-[11px] text-gray-500 font-mono-data">{item.sku}</p>}
                {showCheckout ? <p className="mt-2 text-sm text-gray-300">Quantity {item.quantity}</p> : <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQty(item.productId, -1)}
                    aria-label={`Decrease quantity of ${item.name}`}
                    className="h-10 w-10 rounded-card bg-panel text-base"
                  >
                    −
                  </button>
                  <span className="text-sm font-mono-data">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.productId, 1)}
                    disabled={stockState !== "ready" || item.quantity >= item.availableQuantity}
                    title={item.quantity >= item.availableQuantity ? "Maximum available stock reached" : "Increase quantity"}
                    aria-label={`Increase quantity of ${item.name}`}
                    className="h-10 w-10 rounded-card bg-panel text-base disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>}
                {inventoryMode && !showCheckout && <button type="button" onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.name} from cart`} className="min-h-10 text-sm text-amber underline">Remove</button>}
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
            {!inventoryMode && <>
            <div className="flex justify-between text-gray-400">
              <span>Delivery fee (Maxim)</span>
              <span className="font-mono-data">₱{cart.length ? DELIVERY_FEE : 0}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2">
              <span>Total</span>
              <span className="text-amber font-mono-data">₱{total.toLocaleString()}</span>
            </div>
            </>}
          </div>

          {inventoryMode ? (
            showCheckout ? <CheckoutDetails cart={cart} ready={cart.length > 0 && stockState === "ready"}
              onCartChanged={checkStock} onContinue={openPayment} onCancel={() => setShowCheckout(false)} />
              : <button type="button" disabled={!cart.length || stockState !== "ready"} onClick={() => setShowCheckout(true)}
                className="mt-5 min-h-11 w-full rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50">
                Proceed to checkout
              </button>
          ) : <button
            disabled={!cart.length || stockState !== "ready"}
            onClick={() => navigate("/checkout")}
            className="w-full bg-amber text-gunmetal font-semibold rounded-card py-2.5 mt-5 text-sm disabled:opacity-40"
          >
            Proceed to checkout
          </button>}
          {!showCheckout && <Link to={inventoryMode ? "/shop" : "/"}
            className="mt-2 flex min-h-11 items-center justify-center rounded-card border border-gray-700 text-sm hover:border-amber">
            Continue shopping
          </Link>}
        </div>
      </main>
    </div>
  );
}
