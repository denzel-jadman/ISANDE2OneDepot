import { useEffect, useRef, useState } from "react";
import { inventoryApi } from "../inventoryApi.js";

const control = "mt-1 w-full rounded-card border border-gray-700 bg-gunmetal px-3 py-2.5 text-base";
const requestKey = "onedepot_order_request";
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

async function requestIdFor(payload) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload)));
  const fingerprint = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const saved = sessionStorage.getItem(requestKey)?.split(":");
  if (saved?.[0] === fingerprint) return saved[1];

  const id = crypto.randomUUID();
  sessionStorage.setItem(requestKey, `${fingerprint}:${id}`);
  return id;
}

export default function CheckoutDetails({ cart, ready, onCartChanged, onContinue, onCancel }) {
  const [contact, setContact] = useState({ name: "", phone: "", deliveryAddress: "", note: "" });
  const [settings, setSettings] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [refreshQuote, setRefreshQuote] = useState(0);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setQuoteError("");
    inventoryApi.get("/checkout/settings", { signal: controller.signal })
      .then(({ data }) => setSettings(data))
      .catch((err) => {
        if (!controller.signal.aborted) {
          setQuoteError(err.response?.data?.error ?? "Could not load delivery and payment details.");
        }
      });
    return () => controller.abort();
  }, [refreshQuote]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const phone = contact.phone.trim();
  const digits = phone.replace(/\D/g, "");
  const errors = {
    name: contact.name.trim() ? "" : "Enter the name the shop should ask for.",
    phone: !phone ? "Enter a phone number the shop can reach you at."
      : !/^\+?[\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15
        ? "Enter a valid phone number, such as 0917 123 4567." : "",
    deliveryAddress: contact.deliveryAddress.trim() ? "" : "Enter the full address where the rider should deliver the order.",
  };

  function update(event) {
    const { name, value } = event.target;
    setContact((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!ready || !settings || pending.current) return;
    setError("");
    setChecked(true);
    const invalid = Object.keys(errors).find((field) => errors[field]);
    if (invalid) {
      const field = event.currentTarget.elements.namedItem(invalid);
      requestAnimationFrame(() => field?.focus());
      return;
    }
    pending.current = true;
    setBusy(true);

    const payload = {
      name: contact.name.trim(),
      phone,
      deliveryAddress: contact.deliveryAddress.trim(),
      deliveryFee: settings.fee,
      note: contact.note.trim(),
      items: cart.map(({ productId, quantity, price }) => ({ productId, quantity, price: String(price) }))
        .sort((a, b) => a.productId - b.productId),
    };

    try {
      const requestId = await requestIdFor(payload);
      await inventoryApi.post("/checkout", { ...payload, requestId });
      sessionStorage.removeItem(requestKey);
      onContinue(requestId);
    } catch (err) {
      if (err.response?.data?.code === "CART_CHANGED") onCartChanged();
      if (err.response?.data?.code === "FEE_CHANGED") {
        setSettings(null);
        setRefreshQuote((value) => value + 1);
      }
      setError(err.response?.data?.error ?? "Could not open payment. Try again from this form.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="guided-form mt-5 border-t border-gray-700 pt-5" aria-busy={busy}>
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <div>
          <h2 className="font-heading text-2xl">Delivery details</h2>
          <p className="mt-1 text-sm text-gray-300">Enter your details for Maxim delivery. You’ll see payment instructions on the next screen.</p>
        </div>
        <div>
          <label htmlFor="request-name" className="font-medium">Name *</label>
          <input id="request-name" name="name" required autoFocus maxLength={160} autoComplete="name" className={control}
            value={contact.name} onChange={update} aria-invalid={checked && Boolean(errors.name)}
            aria-describedby={checked && errors.name ? "request-name-error" : undefined} />
          {checked && errors.name && <p id="request-name-error" className="mt-1 text-sm text-[#F6A59F]">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="request-phone" className="font-medium">Phone number *</label>
          <input id="request-phone" name="phone" type="tel" required maxLength={40} autoComplete="tel"
            placeholder="0917 123 4567" className={control} value={contact.phone} onChange={update}
            aria-invalid={checked && Boolean(errors.phone)}
            aria-describedby={checked && errors.phone ? "request-phone-error" : undefined} />
          {checked && errors.phone && <p id="request-phone-error" className="mt-1 text-sm text-[#F6A59F]">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="request-address" className="font-medium">Delivery address *</label>
          <textarea id="request-address" name="deliveryAddress" required maxLength={500} autoComplete="street-address"
            rows={3} placeholder="House or unit, street, barangay, city" className={control}
            value={contact.deliveryAddress} onChange={update} aria-invalid={checked && Boolean(errors.deliveryAddress)}
            aria-describedby={checked && errors.deliveryAddress ? "request-address-error" : undefined} />
          {checked && errors.deliveryAddress && <p id="request-address-error" className="mt-1 text-sm text-[#F6A59F]">{errors.deliveryAddress}</p>}
        </div>
        <label className="block font-medium">
          Note for the shop (optional)
          <textarea name="note" rows={3} maxLength={1000} className={control} value={contact.note}
            onChange={update} placeholder="For example, a landmark near your address" />
        </label>
        {settings ? <div className="space-y-1 rounded-card bg-gunmetal p-3 text-sm">
          {settings.demo && <p className="font-semibold text-amber">Demo checkout. Use a sample address and receipt.</p>}
          <p className="flex justify-between gap-3"><span>Delivery fee (Maxim)</span><span>{money.format(Number(settings.fee))}</span></p>
          <p className="flex justify-between gap-3 font-semibold"><span>Total</span><span>{money.format(subtotal + Number(settings.fee))}</span></p>
        </div> : quoteError ? <p role="alert" className="text-[#F6A59F]">{quoteError}{" "}
          <button type="button" className="text-amber underline" onClick={() => setRefreshQuote((value) => value + 1)}>Try again</button>
        </p> : <p role="status">Loading delivery fee…</p>}
        {error && <p role="alert" className="rounded-card border border-warning/60 p-3 text-sm text-[#F6A59F]">{error}</p>}
        <button type="submit" disabled={!ready || !settings || busy} className="min-h-11 w-full rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50">
          {busy ? "Checking your order…" : "Continue to payment"}
        </button>
        <button type="button" className="min-h-11 text-amber underline" onClick={onCancel}>Back to cart</button>
      </fieldset>
    </form>
  );
}
