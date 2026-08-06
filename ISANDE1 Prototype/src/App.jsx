import { Navigate, Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Shop from "./pages/Shop.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ServiceTicket from "./pages/ServiceTicket.jsx";
import ProductManagement from "./pages/ProductManagement.jsx";
import Settings from "./pages/Settings.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import Repairs from "./pages/Repairs.jsx";
import Customers from "./pages/Customers.jsx";
import Reports from "./pages/Reports.jsx";
import Restocking from "./pages/Restocking.jsx";

function CustomerShopRoute({ children }) {
  const token = localStorage.getItem("onedepot_token");
  if (token) {
    try {
      const user = JSON.parse(atob(token.split(".")[1]));
      if (user.role === "GUNSMITH") return <Navigate to="/repairs" replace />;
    } catch {
    }
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CustomerShopRoute><Shop /></CustomerShopRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/cart" element={<CustomerShopRoute><Cart /></CustomerShopRoute>} />
      <Route path="/checkout" element={<CustomerShopRoute><Checkout /></CustomerShopRoute>} />
      <Route path="/orders" element={<MyOrders />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/repairs/:id" element={<ServiceTicket />} />
      <Route path="/repairs" element={<Repairs />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/restocking" element={<Restocking />} />
      <Route path="/products" element={<ProductManagement />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
