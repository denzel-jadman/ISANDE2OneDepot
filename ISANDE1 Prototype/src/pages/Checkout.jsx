import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

const DELIVERY_FEE = 120;

export default function Checkout() {
  const [cart] = useState(() => JSON.parse(localStorage.getItem("onedepot_cart") || "[]"));
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const total = subtotal + DELIVERY_FEE;

  async function submitOrder() {
    if (!file) {
      setError("Please upload a screenshot of your GCash receipt.");
      return;
    }
    setStatus("submitting");
    setError("");

    const formData = new FormData();
    formData.append("items", JSON.stringify(cart.map((i) => ({ productId: i.productId, quantity: i.quantity }))));
    formData.append("deliveryAddress", address);
    formData.append("contactNumber", contact);
    formData.append("deliveryFee", DELIVERY_FEE);
    formData.append("proofOfPayment", file);

    try {
      await api.post("/orders", formData, { headers: { "Content-Type": "multipart/form-data" } });
      localStorage.removeItem("onedepot_cart");
      setStatus("submitted");
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.error ?? "Could not submit your order. Please try again.");
    }
  }

  if (status === "submitted") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="bg-panel rounded-card p-8">
            <p className="text-olive text-3xl mb-3">✓</p>
            <h1 className="font-heading text-xl mb-2">Order submitted</h1>
            <p className="text-gray-400 text-sm mb-6">
              We'll confirm your order once payment is verified, usually within an hour.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-amber text-gunmetal font-semibold rounded-card px-5 py-2 text-sm"
            >
              Back to shop
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10 grid md:grid-cols-2 gap-6">
        <div className="bg-panel rounded-card p-5">
          <p className="text-xs text-gray-500 font-mono-data mb-1">STEP 2 OF 3</p>
          <h2 className="font-heading text-lg mb-4">Delivery details</h2>

          <label className="text-xs text-gray-400 block mb-1">Delivery address</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Unit, street, barangay, city"
            className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm mb-4 focus:outline-none focus:border-amber"
          />

          <label className="text-xs text-gray-400 block mb-1">Contact number</label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="09xx xxx xxxx"
            className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm mb-5 focus:outline-none focus:border-amber"
          />

          <h3 className="font-heading text-sm mb-3">Order summary</h3>
          <div className="space-y-1 text-sm text-gray-300">
            {cart.map((i) => (
              <div key={i.productId} className="flex justify-between">
                <span>{i.name}</span>
                <span className="font-mono-data">₱{(Number(i.price) * i.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Delivery fee (Maxim)</span>
              <span className="font-mono-data">₱{DELIVERY_FEE}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-gray-700 mt-2">
              <span>Total</span>
              <span className="text-amber font-mono-data">₱{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-panel rounded-card p-5">
          <p className="text-xs text-gray-500 font-mono-data mb-1">STEP 3 OF 3</p>
          <h2 className="font-heading text-lg mb-4">Pay with GCash</h2>

          <div className="bg-gunmetal rounded-card aspect-square max-w-[180px] mx-auto mb-2 flex items-center justify-center text-gray-600 text-xs">
            QR code placeholder
          </div>
          <p className="text-center text-xs text-gray-500 mb-6">
            Scan to pay · Justin's Hobby Depot
          </p>

          <label className="block border border-dashed border-gray-600 rounded-card p-6 text-center text-xs text-gray-400 cursor-pointer hover:border-amber mb-4">
            {file ? file.name : "Upload proof of payment — screenshot of your GCash receipt, JPG or PNG"}
            <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
          </label>

          {error && <p className="text-warning text-xs mb-3">{error}</p>}

          <button
            onClick={submitOrder}
            disabled={status === "submitting"}
            className="w-full bg-white text-gunmetal font-semibold rounded-card py-2.5 text-sm disabled:opacity-50"
          >
            {status === "submitting" ? "Submitting…" : "Submit order"}
          </button>
          <p className="text-center text-[11px] text-gray-500 mt-3">
            We'll confirm your order once payment is verified, usually within an hour.
          </p>
        </div>
      </main>
    </div>
  );
}
