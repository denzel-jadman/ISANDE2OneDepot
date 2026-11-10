import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useOwnerSession } from "../ownerSession.jsx";
import BackLink from "./BackLink.jsx";

const screens = { "/": "Home", "/products": "Products", "/restocking": "Restocking", "/order-requests": "Order requests", "/shop": "Shop" };

function navClass({ isActive }) {
  return `inline-flex min-h-11 items-center rounded-card px-3 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber ${isActive
    ? "bg-gunmetal text-amber"
    : "text-gray-200 hover:text-amber"}`;
}

export default function InventoryNavbar() {
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const { signOut } = useOwnerSession();
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const prior = state?.backTo;
  const backTo = Object.hasOwn(screens, prior) && prior !== pathname
    ? prior
    : pathname === "/restocking" ? "/products" : "/";

  async function logout() {
    setError("");
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="border-b border-panel">
      <nav aria-label="Owner menu" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-4">
        <span className="font-heading text-xl">OneDepot Owner</span>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {Object.entries(screens).map(([path, label]) => (
            <NavLink key={path} end to={path} state={{ backTo: pathname }} className={navClass}>{label}</NavLink>
          ))}
          <button type="button" disabled={signingOut} onClick={logout}
            className="min-h-11 rounded-card px-3 text-base font-semibold text-amber hover:underline disabled:opacity-60">
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        {error && <p role="alert" className="basis-full text-sm text-[#F6A59F]">{error}</p>}
      </nav>
      {pathname !== "/" && <div className="mx-auto max-w-7xl px-5 pb-1">
        <BackLink to={backTo} replace>Back to {screens[backTo]}</BackLink>
      </div>}
    </header>
  );
}
