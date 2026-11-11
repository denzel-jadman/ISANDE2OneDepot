import Navbar from "../components/Navbar.jsx";

// Fill in the blanks below with the shop's real details. Empty values are hidden.
const SHOP_INFO = {
  address: "",
  phone: "",
  facebookUrl: "",
  hours: "",
};

export default function Contact() {
  const rows = [
    ["Location", SHOP_INFO.address || "Cebu City, Philippines"],
    SHOP_INFO.phone && ["Phone", SHOP_INFO.phone],
    SHOP_INFO.hours && ["Store hours", SHOP_INFO.hours],
    ["Payments accepted", "Cash, GCash, and debit bank transfer"],
    ["Delivery", "Booked through Maxim after your payment is verified"],
  ].filter(Boolean);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs text-amber tracking-widest font-mono-data mb-2">GET IN TOUCH</p>
        <h1 className="font-heading text-3xl mb-2">Contact Justin&apos;s Hobby Depot</h1>
        <p className="text-sm text-gray-400 mb-8">Questions about an item, an order, or a repair? Reach the shop using any of the options below.</p>

        <div className="bg-panel border border-gray-700 rounded-card divide-y divide-gray-800 mb-6">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 px-5 py-4 text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="text-right">{value}</span>
            </div>
          ))}
        </div>

        <div className="bg-panel border border-gray-700 rounded-card p-5 text-sm">
          <h2 className="font-heading text-lg mb-2">Message us on Facebook</h2>
          <p className="text-gray-400 mb-4">The shop&apos;s Facebook Page is still the fastest way to ask a question. Check live stock and order on this site, or message us for anything else.</p>
          {SHOP_INFO.facebookUrl ? (
            <a href={SHOP_INFO.facebookUrl} target="_blank" rel="noreferrer" className="inline-block bg-amber text-gunmetal font-semibold rounded-card px-4 py-2">Open Facebook Page</a>
          ) : (
            <p className="text-xs text-gray-500">Search for &quot;Justin&apos;s Hobby Depot&quot; on Facebook.</p>
          )}
        </div>
      </main>
    </div>
  );
}
