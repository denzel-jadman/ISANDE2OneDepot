import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login.jsx";
import OwnerHome from "./pages/OwnerHome.jsx";
import OrderRequests from "./pages/OrderRequests.jsx";
import BackLink from "./components/BackLink.jsx";
import { OwnerSessionProvider, useOwnerSession } from "./ownerSession.jsx";
import { inventoryMode } from "./inventoryApi.js";
import Shop from "./pages/Shop.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import CustomerOrderStatus from "./pages/CustomerOrderStatus.jsx";
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

function OwnerRoute({ children }) {
  const { status } = useOwnerSession();
  const location = useLocation();
  if (!inventoryMode || status === "signed-in") return children;
  if (status === "unavailable") {
    return (
      <main className="mx-auto max-w-lg px-5 py-12">
        <BackLink to="/">Back to home</BackLink>
        <h1 className="mt-4 font-heading text-2xl">Could not open inventory</h1>
        <p role="alert" className="mt-2 text-gray-300">The owner sign-in service is unavailable. Reload the page to try again.</p>
      </main>
    );
  }
  return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
}

function AppRoutes() {
  const { status } = useOwnerSession();
  const { hash } = useLocation();
  if (status === "checking") {
    return <p role="status" className="p-6 text-base text-gray-200">Opening OneDepot…</p>;
  }

  return (
    <Routes>
      <Route path="/" element={status === "signed-in" ? <OwnerHome /> : <CustomerShopRoute><Shop /></CustomerShopRoute>} />
      <Route path="/login" element={<Login />} />
      {inventoryMode && <Route path="/shop" element={<Shop />} />}
      <Route path="/cart" element={<CustomerShopRoute><Cart /></CustomerShopRoute>} />
      <Route path="/checkout" element={inventoryMode ? <Navigate to="/cart" replace /> : <CustomerShopRoute><Checkout /></CustomerShopRoute>} />
      {inventoryMode && <Route path="/order-status" element={<CustomerOrderStatus key={hash} orderKey={hash.slice(1)} />} />}
      <Route path="/orders" element={<MyOrders />} />
      {inventoryMode && <Route path="/order-requests" element={<OwnerRoute><OrderRequests /></OwnerRoute>} />}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/repairs/:id" element={<ServiceTicket />} />
      <Route path="/repairs" element={<Repairs />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/restocking" element={<OwnerRoute><Restocking /></OwnerRoute>} />
      <Route path="/products" element={<OwnerRoute><ProductManagement /></OwnerRoute>} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default function App() {
  return <OwnerSessionProvider><AppRoutes /></OwnerSessionProvider>;
}
