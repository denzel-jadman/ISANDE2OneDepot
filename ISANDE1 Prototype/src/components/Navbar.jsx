import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import NotificationBell from "./NotificationBell.jsx";

function storedUser() {
  const token = localStorage.getItem("onedepot_token");
  if (!token) return null;
  try {
    const user = JSON.parse(atob(token.split(".")[1]));
    return user.role === "OWNER" ? { ...user, name: "Gina" } : user;
  } catch {
    return null;
  }
}

export default function Navbar({ cartCount = 0 }) {
  const [user, setUser] = useState(storedUser);
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("onedepot_token");
    setUser(null);
    navigate("/login");
  }

  return (
    <nav className="flex items-center justify-between px-8 py-5 border-b border-panel">
      <Link to={user?.role === "GUNSMITH" ? "/repairs" : "/"} className="font-heading text-2xl font-bold tracking-wide">
        JUSTIN'S <span className="text-amber">HOBBY DEPOT</span>
      </Link>
      <div className="flex items-center gap-7 text-base font-semibold text-gray-300">
        {user?.role !== "GUNSMITH" && <Link to="/" className="hover:text-amber transition-colors">Shop</Link>}
        {user && (user.role === "OWNER" || user.role === "STAFF") && (
          <Link to="/products" className="hover:text-amber transition-colors">Products</Link>
        )}
        {user && (user.role === "OWNER" || user.role === "STAFF") && (
          <Link to="/restocking" className="hover:text-amber transition-colors">Restock</Link>
        )}
        {user && (user.role === "OWNER" || user.role === "STAFF") && (
          <Link to="/customers" className="hover:text-amber transition-colors">Customers</Link>
        )}
        {user?.role === "CUSTOMER" && (
          <Link to="/orders" className="hover:text-amber transition-colors">My orders</Link>
        )}
        <Link to="/repairs" className="hover:text-amber transition-colors">Repairs</Link>
        {user && (user.role === "OWNER" || user.role === "STAFF") && (
          <Link to="/dashboard" className="hover:text-amber transition-colors">Dashboard</Link>
        )}
        {user && (user.role === "OWNER" || user.role === "STAFF") && (
          <Link to="/reports" className="hover:text-amber transition-colors">Reports</Link>
        )}
        {user?.role !== "GUNSMITH" && (
          <Link to="/cart" className="flex items-center gap-2 bg-panel px-4 py-2 rounded-card hover:bg-panel/70 transition-colors">
            Cart · {cartCount}
          </Link>
        )}
        <NotificationBell user={user} />

        {user ? (
          <div className="flex items-center gap-5 pl-7 border-l border-gray-700">
            <span className="text-gray-300">{user.name}</span>
            <Link
              to="/settings"
              className="text-gray-300 hover:text-amber transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="text-amber hover:text-amber/70 transition-colors font-semibold"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="text-amber hover:text-amber/70 transition-colors font-semibold"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
