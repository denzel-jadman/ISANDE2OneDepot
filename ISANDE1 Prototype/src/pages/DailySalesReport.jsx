import { useEffect, useState } from "react";
import InventoryNavbar from "../components/InventoryNavbar.jsx";
import { inventoryApi } from "../inventoryApi.js";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dayLabel = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila", day: "numeric", month: "short", year: "numeric",
});
const dateInput = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Manila" });

export default function DailySalesReport() {
  const [range, setRange] = useState(() => {
    const today = dateInput.format(new Date());
    return { from: today, to: today };
  });
  const [requested, setRequested] = useState(range);
  const [days, setDays] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    inventoryApi.get("/reports/daily-sales", { params: requested, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setDays(data.days);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.response?.data?.error ?? "Could not load sales. Try again.");
      });
    return () => controller.abort();
  }, [requested]);

  function submit(event) {
    event.preventDefault();
    setDays(null);
    setError("");
    setRequested({ ...range });
  }

  return (
    <>
      <InventoryNavbar />
      <main className="mx-auto max-w-4xl space-y-4 px-5 py-7">
        <h1 className="font-heading text-3xl">Daily sales</h1>
        <p className="text-gray-300">Walk-in sales count on the day they are recorded. Online orders count when completed. Amounts cover products only and exclude delivery fees and demo checkout orders.</p>
        <form onSubmit={submit} className="guided-form flex flex-wrap items-end gap-3 rounded-card bg-panel p-4">
          <label className="grid gap-1 text-sm font-semibold">
            Start date
            <input type="date" required value={range.from} max={range.to || undefined}
              onChange={(event) => setRange({ ...range, from: event.target.value })}
              className="min-h-11 rounded-card border border-gray-700 bg-gunmetal px-3 text-base" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            End date
            <input type="date" required value={range.to} min={range.from || undefined}
              onChange={(event) => setRange({ ...range, to: event.target.value })}
              className="min-h-11 rounded-card border border-gray-700 bg-gunmetal px-3 text-base" />
          </label>
          <button className="min-h-11 rounded-card bg-amber px-4 font-semibold text-gunmetal">Show sales</button>
          <p className="w-full text-sm text-gray-300">Up to 31 days per report. Dates use Philippine time.</p>
        </form>
        {error && <p role="alert" className="text-[#F6A59F]">{error}</p>}
        {!days && !error && <p role="status">Loading sales…</p>}
        {days && <div className="overflow-x-auto rounded-card bg-panel">
          <table className="w-full min-w-[28rem] text-left">
            <caption className="sr-only">Daily sales by channel</caption>
            <thead className="bg-gunmetal">
              <tr>
                <th scope="col" className="p-3">Date</th>
                <th scope="col" className="p-3">Walk-in sales</th>
                <th scope="col" className="p-3">Completed online orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {days.map(({ date, walkIn, online }) => <tr key={date}>
                <th scope="row" className="p-3 font-medium">{dayLabel.format(new Date(date + "T00:00:00+08:00"))}</th>
                <td className="p-3">
                  <p>{money.format(walkIn.amount)}</p>
                  <p className="text-sm text-gray-300">{walkIn.transactions} {walkIn.transactions === 1 ? "sale" : "sales"}</p>
                </td>
                <td className="p-3">
                  <p>{money.format(online.amount)}</p>
                  <p className="text-sm text-gray-300">{online.transactions} {online.transactions === 1 ? "order" : "orders"}</p>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </main>
    </>
  );
}
