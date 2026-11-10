import { useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import api from "../api.js";
import BackLink from "../components/BackLink.jsx";
import { inventoryMode } from "../inventoryApi.js";
import { useOwnerSession } from "../ownerSession.jsx";

const control = "mt-1 w-full rounded-card border border-gray-700 bg-gunmetal px-3 py-2.5 text-base";

function LoginFieldError({ id, children }) {
  return children && <p id={id} className="mt-1 text-sm text-[#F6A59F]">{children}</p>;
}

export default function Login() {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { status, signIn } = useOwnerSession();
  const returnTo = ["/products", "/restocking", "/order-requests"].includes(location.state?.returnTo) ? location.state.returnTo : "/";

  if (status === "signed-in") return <Navigate to={returnTo} replace state={{ backTo: "/" }} />;

  const nameError = registering && !form.name.trim() ? "Enter your name." : "";
  const email = form.email.trim();
  const emailError = !email ? "Enter your email address."
    : !/^[^\s@]+@[^\s@]+$/.test(email) ? "Enter a valid email address, such as name@example.com." : "";
  const passwordError = !form.password ? "Enter your password." : "";

  function switchMode(value) {
    setRegistering(value);
    setChecked(false);
    setError("");
  }

  function field(name, message) {
    const invalid = checked && Boolean(message);
    return { id: `login-${name}`, name, "aria-invalid": invalid || undefined, "aria-describedby": invalid ? `login-${name}-error` : undefined };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    const invalid = nameError ? "name" : emailError ? "email" : passwordError ? "password" : null;
    if (invalid) {
      setChecked(true);
      const input = event.currentTarget.elements.namedItem(invalid);
      requestAnimationFrame(() => input?.focus());
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setChecked(false);
    let ownerServiceUnavailable = false;
    try {
      if (inventoryMode && !registering) {
        try {
          if (await signIn({ email, password: form.password })) return;
        } catch {
          ownerServiceUnavailable = true;
        }
      }
      const endpoint = registering ? "/auth/register" : "/auth/login";
      const { data } = await api.post(endpoint, { ...form, email, shopOnly: inventoryMode });
      localStorage.setItem("onedepot_token", data.token);
      navigate(data.user?.role === "GUNSMITH" ? "/repairs" : "/", { replace: true });
    } catch (err) {
      const message = registering
        ? err.response?.data?.error ?? "Could not create your account. Please try again."
        : ownerServiceUnavailable
          ? "The owner sign-in service is unavailable. Please try again in a moment."
          : "We couldn’t sign you in. Check your email and password and try again.";
      setError(message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-7 sm:py-14">
      <BackLink to="/">Back to home</BackLink>
      <div className="mt-3 rounded-card border border-gray-700 bg-panel p-5 sm:p-8">
        <p className="font-heading text-lg text-amber">Justin’s Hobby Depot</p>
        <h1 className="mt-1 font-heading text-3xl">{registering ? "Create a customer account" : "Sign in to OneDepot"}</h1>
        <p className="mb-5 mt-2 text-base text-gray-300">
          {registering ? "Use an email address you can remember." : "Enter your email address and password."}
        </p>

        <form noValidate onSubmit={handleSubmit} className="guided-form" aria-busy={busy}>
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            {registering && (
              <div>
                <label htmlFor="login-name" className="font-medium">Name</label>
                <input {...field("name", nameError)} required autoComplete="name" className={control}
                  value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <LoginFieldError id="login-name-error">{checked && nameError}</LoginFieldError>
              </div>
            )}
            <div>
              <label htmlFor="login-email" className="font-medium">Email address</label>
              <input {...field("email", emailError)} required type="email" autoComplete="username" className={control}
                value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              <LoginFieldError id="login-email-error">{checked && emailError}</LoginFieldError>
            </div>
            <div>
              <label htmlFor="login-password" className="font-medium">Password</label>
              <input {...field("password", passwordError)} required type={showPassword ? "text" : "password"}
                autoComplete={registering ? "new-password" : "current-password"} className={control}
                value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <LoginFieldError id="login-password-error">{checked && passwordError}</LoginFieldError>
              <label className="mt-1 inline-flex min-h-10 items-center gap-2 text-sm text-gray-200">
                <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
                Show password
              </label>
            </div>
            {error && <p role="alert" className="rounded-card border border-warning/60 bg-gunmetal p-3 text-sm text-[#F6A59F]">{error}</p>}
            <button type="submit" className="min-h-11 w-full rounded-card bg-amber px-4 py-2 text-base font-semibold text-gunmetal hover:bg-amber/80 disabled:opacity-60">
              {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
            </button>
          </fieldset>
        </form>

        <button type="button" disabled={busy} onClick={() => switchMode(!registering)}
          className="mt-3 inline-flex min-h-11 items-center text-base text-amber underline disabled:opacity-60">
          {registering ? "Back to sign in" : "Create a customer account"}
        </button>
      </div>
    </main>
  );
}
