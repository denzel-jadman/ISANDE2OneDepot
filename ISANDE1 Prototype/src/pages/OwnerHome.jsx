import { Link } from "react-router-dom";
import InventoryNavbar from "../components/InventoryNavbar.jsx";

const tasks = [
  { path: "/products", label: "Products", description: "Check stock, add products, and manage suppliers." },
  { path: "/restocking", label: "Restocking", description: "Create purchase orders and record deliveries as they arrive." },
  { path: "/order-requests", label: "Order requests", description: "Review requests from shoppers and contact them to arrange orders." },
];

export default function OwnerHome() {
  return (
    <>
      <InventoryNavbar />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <h1 className="font-heading text-3xl sm:text-4xl">Owner home</h1>
        <p className="mt-3 text-base text-gray-300">Choose what you’d like to do.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tasks.map(({ path, label, description }) => (
            <section key={path} className="rounded-card border border-gray-700 bg-panel p-5">
              <h2 className="font-heading text-2xl">{label}</h2>
              <p className="mt-2 text-base text-gray-300">{description}</p>
              <Link to={path} state={{ backTo: "/" }}
                className="mt-5 inline-flex min-h-11 items-center rounded-card bg-amber px-4 font-semibold text-gunmetal hover:bg-amber/80">
                Open {label}
              </Link>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
