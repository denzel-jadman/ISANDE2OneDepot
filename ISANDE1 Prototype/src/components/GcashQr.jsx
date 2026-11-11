import { useEffect, useState } from "react";
import api from "../api.js";

// Shows the store's GCash QR code. The owner uploads it under Settings.
export default function GcashQr({ size = "md" }) {
  const [qr, setQr] = useState(undefined);

  useEffect(() => {
    api.get("/store-settings").then(({ data }) => setQr(data.gcashQr ?? null)).catch(() => setQr(null));
  }, []);

  const box = size === "sm" ? "h-40 w-40" : "h-48 w-48";
  if (qr) {
    return <img src={qr} alt="Justin's Hobby Depot GCash QR code" className={`${box} mx-auto rounded-card bg-white object-contain p-2`} />;
  }
  return (
    <div className={`${box} mx-auto rounded-card bg-gunmetal border border-dashed border-gray-600 flex items-center justify-center text-center text-xs text-gray-500 px-4`}>
      {qr === undefined ? "Loading…" : "GCash QR not set up yet. Ask the shop for payment details."}
    </div>
  );
}
