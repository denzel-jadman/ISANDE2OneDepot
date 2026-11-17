import { useEffect, useRef, useState } from "react";
import InventoryNavbar from "../components/InventoryNavbar.jsx";
import { inventoryApi } from "../inventoryApi.js";

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const pendingKey = "onedepot_pending_walk_in_sale";
const panel = "rounded-card border border-gray-700 bg-panel p-4 sm:p-5";
const control = "min-h-11 rounded-card border border-gray-700 bg-gunmetal px-3";
const primary = "min-h-11 rounded-card bg-amber px-4 font-semibold text-gunmetal disabled:opacity-50";

function totalFor(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

function SalesRecord({ sale }) {
  return (
    <>
      <p className="text-sm text-gray-300">{new Date(sale.createdAt).toLocaleString()}</p>
      <ul className="mt-2 space-y-1">
        {sale.items.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-x-3">
          <span>{item.quantity} × {item.name} <span className="text-sm text-gray-300">({item.sku})</span></span>
          <span>{money.format(totalFor([item]))}</span>
        </li>)}
      </ul>
      <p className="mt-3 font-semibold">Total {money.format(totalFor(sale.items))}</p>
    </>
  );
}

export default function WalkInSales() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState([]);
  const [pending, setPending] = useState(() => JSON.parse(sessionStorage.getItem(pendingKey) || "null"));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const saving = useRef(false);

  async function loadProducts(signal) {
    setLoading(true);
    setStockError("");
    try {
      const { data } = await inventoryApi.get("/products", { signal });
      setProducts(data);
    } catch {
      if (!signal?.aborted) setStockError("Could not load current stock. Try refreshing stock.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadProducts(controller.signal);
    return () => controller.abort();
  }, []);

  async function loadHistory(before) {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const { data } = await inventoryApi.get("/walk-in-sales", { params: { before } });
      setHistory((previous) => before ? { ...data, sales: [...previous.sales, ...data.sales] } : data);
    } catch {
      setHistoryError("Could not load sales history. Try again.");
    } finally {
      setLoadingHistory(false);
    }
  }

  const byId = new Map(products.map((product) => [product.id, product]));
  const details = (pending?.items ?? lines).map((line) => ({
    ...line,
    current: byId.get(line.productId),
  }));
  const invalid = details.some(({ current, quantity }) =>
    !current || !/^[1-9]\d*$/.test(String(quantity)) || Number(quantity) > current.quantity);
  const search = query.trim().toLowerCase();
  const matches = products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(search));

  function addProduct(product) {
    setSaved(null);
    setError("");
    setLines((current) => [...current, { productId: product.id, name: product.name, sku: product.sku, quantity: "1" }]);
    setQuery("");
  }

  async function record(event) {
    event.preventDefault();
    if (saving.current || loadingHistory || (!pending && (invalid || !lines.length || loading || stockError))) return;
    saving.current = true;
    setBusy(true);
    setError("");
    const sale = pending ?? {
      requestId: crypto.randomUUID(),
      items: details.map(({ productId, name, sku, current, quantity }) =>
        ({ productId, name, sku, quantity: Number(quantity), price: String(current.price) })),
    };
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(sale));
      setPending(sale);
      const { data } = await inventoryApi.post("/walk-in-sales", {
        requestId: sale.requestId,
        items: sale.items.map(({ productId, quantity, price }) => ({ productId, quantity, price })),
      });
      sessionStorage.removeItem(pendingKey);
      setPending(null);
      setLines([]);
      setSaved(data);
      setHistory(null);
      await loadProducts();
    } catch (err) {
      if (err.response?.data?.code === "SALE_CHANGED") {
        sessionStorage.removeItem(pendingKey);
        setPending(null);
        setLines(sale.items.map((item) => ({ ...item, quantity: String(item.quantity) })));
        setError(err.response.data.error);
        await loadProducts();
      } else {
        setError(err.response?.data?.error ?? "Could not verify that the sale was saved. Use Retry sale to check.");
      }
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <InventoryNavbar />
      <main className="mx-auto max-w-4xl space-y-5 px-5 py-7">
        <h1 className="font-heading text-3xl">Walk-in sales</h1>
        {saved && <section className={panel} aria-labelledby="saved-sale">
          <h2 id="saved-sale" className="font-heading text-xl"><span role="status">Sale recorded · {saved.reference}</span></h2>
          <SalesRecord sale={saved} />
        </section>}
        <section className={panel} aria-labelledby="new-sale">
          <h2 id="new-sale" className="font-heading text-2xl">New walk-in sale</h2>
          {pending ? <p className="mt-2 text-gray-300">Retry this sale to check whether it was saved. Retrying uses the same sale reference.</p> : (
            <div className="mt-3 space-y-2">
              <label htmlFor="sale-search" className="block font-semibold">Search by product name or SKU</label>
              <div className="flex flex-wrap gap-2">
                <input id="sale-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                  className={`${control} min-w-0 flex-1`} />
                <button type="button" className={control} disabled={loading} onClick={() => loadProducts()}>Refresh stock</button>
              </div>
              {loading && <p role="status">Loading stock…</p>}
              {stockError && <p role="alert" className="text-[#F6A59F]">{stockError}</p>}
              {!loading && !stockError && search && (
                matches.length ? <ul className="divide-y divide-gray-700">
                  {matches.slice(0, 12).map((product) => {
                    const added = lines.some(({ productId }) => productId === product.id);
                    return <li key={product.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <div>
                        <p>{product.name}</p>
                        <p className="text-sm text-gray-300">{product.sku} · {money.format(Number(product.price))} · {product.quantity} in stock</p>
                      </div>
                      <button type="button" aria-label={`Add ${product.name}`} className={primary}
                        disabled={added || product.quantity < 1 || lines.length >= 50} onClick={() => addProduct(product)}>
                        {added ? "Added" : "Add"}
                      </button>
                    </li>;
                  })}
                </ul> : <p>No matching products.</p>
              )}
            </div>
          )}
          <form noValidate onSubmit={record} className="guided-form mt-4 space-y-3" aria-busy={busy}>
            {!!details.length && <ul className="divide-y divide-gray-700">
              {details.map(({ productId, current, name, sku, quantity }) => {
                const issue = !current ? "This product is unavailable." : !/^[1-9]\d*$/.test(String(quantity))
                  ? "Enter a whole quantity of at least 1." : Number(quantity) > current.quantity
                    ? `Only ${current.quantity} in stock. Reduce the quantity or remove this item.` : "";
                return <li key={productId} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{current?.name ?? name}</p>
                      <p className="text-sm text-gray-300">{current?.sku ?? sku} {current && !pending && `· ${money.format(Number(current.price))} each`}</p>
                    </div>
                    {pending ? <span>Quantity {quantity}</span> : <div className="flex items-center gap-2">
                      <label htmlFor={`sale-quantity-${productId}`} className="text-sm">Qty <span className="sr-only">{name}</span></label>
                      <input id={`sale-quantity-${productId}`} type="number" min="1" inputMode="numeric" value={quantity}
                        aria-invalid={Boolean(issue) && !loading} aria-describedby={issue ? `sale-issue-${productId}` : undefined}
                        className={`${control} w-20`} onChange={(event) => setLines((old) => old.map((item) =>
                          item.productId === productId ? { ...item, quantity: event.target.value } : item))} />
                      <button type="button" className={`${control} text-amber`} aria-label={`Remove ${name}`}
                        onClick={() => setLines((old) => old.filter((item) => item.productId !== productId))}>Remove</button>
                    </div>}
                  </div>
                  {!pending && !loading && issue && <p id={`sale-issue-${productId}`} className="mt-1 text-sm text-[#F6A59F]">{issue}</p>}
                </li>;
              })}
            </ul>}
            {error && <p role="alert" className="rounded-card border border-warning/60 p-3 text-[#F6A59F]">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Total {money.format(totalFor(details.map((item) =>
                ({ ...item, price: pending ? item.price : item.current?.price ?? 0 }))))}</p>
              <button type="submit" disabled={busy || loadingHistory || (!pending && (loading || !!stockError || !lines.length || invalid))}
                className={primary}>{busy ? "Saving…" : pending ? "Retry sale" : "Record sale"}</button>
            </div>
          </form>
        </section>
        <section className={panel} aria-labelledby="sales-history">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sales-history" className="font-heading text-2xl">Sales history</h2>
            <button type="button" className={control} disabled={loadingHistory || busy} onClick={() => loadHistory()}>
              {history ? "Refresh history" : "Show sales history"}
            </button>
          </div>
          {loadingHistory && <p role="status">Loading sales…</p>}
          {historyError && <p role="alert" className="text-[#F6A59F]">{historyError}</p>}
          {history?.sales.length === 0 && <p className="mt-2 text-gray-300">No walk-in sales recorded yet.</p>}
          {history?.sales.map((sale) => <article key={sale.id} className="mt-3 rounded-card bg-gunmetal p-3">
            <h3 className="font-semibold text-amber">{sale.reference}</h3>
            <SalesRecord sale={sale} />
          </article>)}
          {history?.next && <button type="button" className={`mt-3 ${control}`} disabled={loadingHistory || busy}
            onClick={() => loadHistory(history.next)}>Show older sales</button>}
        </section>
      </main>
    </>
  );
}
