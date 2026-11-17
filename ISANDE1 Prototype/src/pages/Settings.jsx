import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";
import GcashQr from "../components/GcashQr.jsx";

export default function Settings() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [qrFile, setQrFile] = useState(null);
  const [qrMessage, setQrMessage] = useState("");
  const [qrKey, setQrKey] = useState(0);

  const token = localStorage.getItem("onedepot_token");
  let isOwner = false;
  try { isOwner = JSON.parse(atob(token.split(".")[1])).role === "OWNER"; } catch { isOwner = false; }
  if (!token) {
    navigate("/login");
    return null;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (form.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setSuccess("Password changed successfully!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  async function saveQr(event) {
    event.preventDefault();
    setQrMessage("");
    if (!qrFile) { setQrMessage("Choose an image of your GCash QR code first."); return; }
    try {
      const formData = new FormData();
      formData.append("gcashQr", qrFile);
      await api.patch("/store-settings", formData);
      setQrFile(null);
      setQrKey((key) => key + 1);
      setQrMessage("GCash QR code saved. Customers will see it at checkout.");
    } catch (err) {
      setQrMessage(err.response?.data?.error ?? "Could not save the QR code.");
    }
  }

  async function removeQr() {
    await api.patch("/store-settings", { removeGcashQr: true });
    setQrKey((key) => key + 1);
    setQrMessage("GCash QR code removed.");
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="font-heading text-3xl mb-2">Settings</h1>
        <p className="text-gray-400 text-sm mb-8">Manage your account preferences</p>

        <div className="bg-panel border border-gray-700 rounded-card p-8">
          <h2 className="font-heading text-xl mb-6">Change Password</h2>

          {error && (
            <div className="bg-warning/20 border border-warning text-warning rounded-card px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-olive/20 border border-olive text-olive rounded-card px-4 py-3 mb-6 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="text-xs text-gray-400 block mb-2">Current Password</label>
              <input
                required
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="Enter your current password"
                className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2">New Password</label>
              <input
                required
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                placeholder="Enter your new password"
                className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-2">Confirm New Password</label>
              <input
                required
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="Confirm your new password"
                className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-gunmetal font-semibold rounded-card py-2 text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>

        {isOwner && (
          <div className="bg-panel border border-gray-700 rounded-card p-8 mt-6">
            <h2 className="font-heading text-xl mb-2">GCash QR code</h2>
            <p className="text-sm text-gray-400 mb-5">Upload the shop&apos;s GCash QR. It appears on the online checkout and the repair payment screen.</p>
            <div className="mb-5" key={qrKey}><GcashQr /></div>
            <form onSubmit={saveQr} className="space-y-4">
              <input type="file" accept="image/png,image/jpeg" onChange={(event) => setQrFile(event.target.files?.[0] ?? null)} className="w-full text-xs text-gray-400" />
              {qrMessage && <p className="text-sm text-gray-300">{qrMessage}</p>}
              <div className="flex gap-3">
                <button type="submit" className="bg-amber text-gunmetal font-semibold rounded-card px-4 py-2 text-sm">Save QR code</button>
                <button type="button" onClick={removeQr} className="border border-gray-700 rounded-card px-4 py-2 text-sm hover:border-amber">Remove</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
