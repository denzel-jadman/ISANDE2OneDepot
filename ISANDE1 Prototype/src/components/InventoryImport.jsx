import { useState } from "react";
import { inventoryApi } from "../inventoryApi.js";

const files = [
  { key: "suppliers", label: "Suppliers" },
  { key: "inventory", label: "Opening inventory" },
];

const supplierColumns = [
  ["row", "Row"], ["name", "Name"], ["email", "Email"], ["phone", "Phone"],
];
const inventoryColumns = [
  ["row", "Row"], ["sku", "SKU"], ["name", "Name"], ["category", "Category"],
  ["price", "Price (₱)"], ["quantity", "Opening quantity"], ["lowStockAt", "Low-stock threshold"],
  ["supplier", "Supplier"],
];

function PreviewTable({ title, rows, columns }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="mb-2 text-left font-semibold">{title}</caption>
        <thead className="bg-gunmetal">
          <tr>{columns.map(([key, label]) => <th key={key} scope="col" className="p-2">{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.row} className="border-b border-gray-700">
              {columns.map(([key]) => <td key={key} className="p-2 break-words">{row[key] ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InventoryImport({ onImported }) {
  const [selected, setSelected] = useState({});
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function changeFile(key, file) {
    setSelected((current) => ({ ...current, [key]: file }));
    setReview(null);
    setError("");
    setResult(null);
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const importing = event.nativeEvent.submitter?.value === "commit";
    if (busy || (importing && (!review || review.issues.length))) return;

    setBusy(true);
    setError("");
    setResult(null);
    try {
      if (importing) {
        const { data } = await inventoryApi.post("/import/commit", review.batch);
        setResult(data);
        setReview(null);
        setSelected({});
        form.reset();
        await onImported();
      } else {
        setReview(null);
        if (Object.values(selected).some((file) => file?.size > 128 * 1024)) {
          setError("Each CSV must be 128 KB or smaller.");
          return;
        }
        const batch = {
          suppliersCsv: await selected.suppliers?.text(),
          inventoryCsv: await selected.inventory?.text(),
        };
        const { data } = await inventoryApi.post("/import/preview", batch);
        setReview({ ...data, batch });
      }
    } catch (err) {
      if (err.response?.status === 401) return;
      const response = err.response?.data;
      setError(response?.error ?? "Could not process the import. Try again.");
      if (importing) setReview(response?.issues ? { ...response, batch: review.batch } : null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="bg-panel border border-gray-700 rounded-card p-4 mb-6">
      <summary className="cursor-pointer font-semibold">Import suppliers and opening inventory</summary>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <p className="text-sm text-gray-300">
          Use one or both CSV templates, with up to 250 rows per file. Enter verified quantities as whole numbers
          and prices in pesos without currency symbols. Leave the supplier blank if unknown, or use its exact name.
          Use the supplier CSV for new suppliers. A blank low-stock threshold defaults to 5.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {files.map(({ key, label }) => (
            <div key={key}>
              <a className="text-amber underline text-sm" href={`/api/inventory/import/templates/${key}`} download>
                Download {label.toLowerCase()} template
              </a>
              <label className="block mt-2 text-sm">
                {label} CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(event) => changeFile(key, event.target.files[0])}
                  className="block mt-1 max-w-full"
                />
              </label>
            </div>
          ))}
        </div>
        {error && <p role="alert" className="text-warning text-sm">{error}</p>}
        {result && <p role="status" className="text-gray-200 text-sm">
          Imported {result.products} product(s) and {result.suppliers} supplier(s).
        </p>}
        {review && (
          <div className="space-y-3">
            {review.issues.length > 0 && (
              <div role="alert" className="border border-warning rounded-card p-3 text-sm">
                <p className="text-warning font-semibold">Fix these issues before importing.</p>
                <ul className="mt-2 list-disc pl-5">
                  {review.issues.map(({ file, row, message }, index) => (
                    <li key={index}>{files.find((entry) => entry.key === file)?.label} {row && `row ${row} — `}{message}</li>
                  ))}
                </ul>
              </div>
            )}
            <PreviewTable title="Suppliers" rows={review.suppliers} columns={supplierColumns} />
            <PreviewTable title="Opening inventory" rows={review.products} columns={inventoryColumns} />
          </div>
        )}
        <div className="flex gap-3">
          <button type="submit" value="preview" disabled={busy || !Object.values(selected).some(Boolean)}
            className="bg-white text-gunmetal rounded-card px-4 py-2 font-semibold disabled:opacity-50">
            Preview import
          </button>
          {review && !review.issues.length && (
            <button type="submit" value="commit" disabled={busy}
              className="bg-amber text-gunmetal rounded-card px-4 py-2 font-semibold disabled:opacity-50">
              Import {review.products.length} product(s) and {review.suppliers.length} supplier(s)
            </button>
          )}
        </div>
      </form>
    </details>
  );
}
