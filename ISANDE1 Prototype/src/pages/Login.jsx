import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(endpoint, form);
      localStorage.setItem("onedepot_token", data.token);
      navigate(data.user?.role === "GUNSMITH" ? "/repairs" : "/");
    } catch (err) {
      setError(err.response?.data?.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-panel rounded-card p-8">
        <h1 className="font-heading text-2xl mb-1">
          JUSTIN'S <span className="text-amber">HOBBY DEPOT</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6">Track your orders and repairs</p>

        <div className="flex mb-6 rounded-card overflow-hidden border border-gunmetal">
          <button
            className={`flex-1 py-2 text-sm ${mode === "login" ? "bg-gunmetal font-semibold" : "text-gray-400"}`}
            onClick={() => setMode("login")}
          >
            Log in
          </button>
          <button
            className={`flex-1 py-2 text-sm ${mode === "register" ? "bg-gunmetal font-semibold" : "text-gray-400"}`}
            onClick={() => setMode("register")}
          >
            Create account
          </button>
        </div>

        <div className="bg-olive/20 border border-olive text-sm rounded-card px-4 py-3 mb-5 text-gray-200">
          Log in to check your repair status, order history, and restock notifications.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Name</label>
              <input
                required
                className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Mobile number or email</label>
            <input
              required
              type="email"
              placeholder="you@example.com"
              className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-gray-400">Password</label>
              {mode === "login" && (
                <button type="button" className="text-xs text-amber hover:underline">
                  Forgot password?
                </button>
              )}
            </div>
            <input
              required
              type="password"
              className="w-full bg-gunmetal border border-gray-700 rounded-card px-3 py-2 text-sm focus:outline-none focus:border-amber"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error && <p className="text-warning text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-white text-gunmetal font-semibold rounded-card py-2 text-sm hover:bg-gray-200 transition-colors"
          >
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <button
          onClick={() => navigate("/")}
          className="w-full border border-gray-700 rounded-card py-2 text-sm hover:border-amber transition-colors"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
