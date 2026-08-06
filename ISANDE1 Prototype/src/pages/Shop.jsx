import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api.js";

const productPhotos = {
  "Airsoft Rifles": "/product-photos/airsoft-rifle.svg",
  "Airsoft Pistols": "/product-photos/airsoft-rifle.svg",
  "Airsoft Parts & Internals": "/product-photos/airsoft-parts.svg",
  "Gun Attachments": "/product-photos/gun-attachments.svg",
  "Batteries & Chargers": "/product-photos/gun-attachments.svg",
  "Gas & Ammunition": "/product-photos/airsoft-parts.svg",
  "Storage & Carry": "/product-photos/gun-attachments.svg",
  "Protective Gear": "/product-photos/gun-attachments.svg",
  Clothing: "/product-photos/gun-attachments.svg",
  "Knives & Utilities": "/product-photos/gun-attachments.svg",
};

const fallbackPhoto = "/product-photos/airsoft-parts.svg";

const shopSections = [
  { title: "Rifles & Pistols", categories: ["Airsoft Rifles", "Airsoft Pistols"] },
  { title: "Parts", categories: ["Airsoft Parts & Internals"] },
  { title: "Accessories", categories: ["Gun Attachments", "Batteries & Chargers", "Gas & Ammunition", "Storage & Carry"] },
  { title: "Gear & Apparel", categories: ["Protective Gear", "Clothing", "Knives & Utilities"] },
];

const featuredCategoryOrder = [
  "Airsoft Rifles",
  "Airsoft Pistols",
  "Gun Attachments",
  "Airsoft Parts & Internals",
  "Protective Gear",
];

const categoryOptions = [
  { label: "All", value: "" },
  { label: "Rifles", value: "Airsoft Rifles" },
  { label: "Pistols", value: "Airsoft Pistols" },
  { label: "Parts", value: "Airsoft Parts & Internals" },
  { label: "Attachments", value: "Gun Attachments" },
  { label: "Batteries", value: "Batteries & Chargers" },
  { label: "Gas & Ammo", value: "Gas & Ammunition" },
  { label: "Storage", value: "Storage & Carry" },
  { label: "Protection", value: "Protective Gear" },
  { label: "Clothing", value: "Clothing" },
  { label: "Utilities", value: "Knives & Utilities" },
];

function sortProducts(products, sortBy) {
  const sorted = [...products];
  if (sortBy === "price-asc") return sorted.sort((a, b) => Number(a.price) - Number(b.price));
  if (sortBy === "price-desc") return sorted.sort((a, b) => Number(b.price) - Number(a.price));
  if (sortBy === "best-sellers") return sorted.sort((a, b) => Number(b.unitsSold ?? 0) - Number(a.unitsSold ?? 0) || a.name.localeCompare(b.name));
  if (sortBy === "alpha-asc") return sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (sortBy === "alpha-desc") return sorted.sort((a, b) => b.name.localeCompare(a.name));
  return sorted;
}

function shopUser() {
  const token = localStorage.getItem("onedepot_token");
  if (!token) return null;
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

function ProductCard({ product, quantityInCart, onAddToCart, isWaitlisted, onAddToWaitlist, waitlistUserRole }) {
  const [cardHovered, setCardHovered] = useState(false);
  const inStock = product.quantity > 0;
  const canAddToCart = inStock && quantityInCart < Number(product.quantity);

  return (
    <article
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      className="flex flex-col bg-panel rounded-card p-4 hover:ring-1 hover:ring-amber hover:-translate-y-1 transition-all"
    >
      <div className="relative h-48 mb-4 overflow-hidden rounded-card bg-gunmetal cursor-crosshair">
        <img src={productPhotos[product.category] ?? fallbackPhoto} alt={product.name} className="w-full h-full object-cover" />
        <span className={`absolute top-3 left-3 z-20 text-[10px] font-mono-data font-bold px-2.5 py-1 rounded-pill ${inStock ? "bg-olive text-gunmetal" : "bg-warning text-white"}`}>
          {inStock ? "IN STOCK" : "OUT OF STOCK"}
        </span>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            opacity: cardHovered ? 1 : 0,
            visibility: cardHovered ? "visible" : "hidden",
            background: "rgba(17, 16, 13, 0.38)",
            transition: "opacity 150ms ease",
          }}
        >
          <svg width="82" height="82" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 0 5px rgba(245, 166, 35, 1))" }}>
            <circle cx="50" cy="50" r="27" stroke="#F5A623" strokeWidth="3" />
            <path d="M50 3V23M50 77V97M3 50H23M77 50H97" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
            <path d="M50 38V62M38 50H62" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="50" r="3.5" fill="#F5A623" />
          </svg>
        </span>
      </div>

      <p className="text-[11px] text-gray-500 font-mono-data">{product.sku}</p>
      <p className="text-base font-semibold mb-3 min-h-[3rem]">{product.name}</p>
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-amber font-mono-data text-base font-bold">PHP {Number(product.price).toLocaleString()}</span>
        {inStock ? (
          <button onClick={() => onAddToCart(product)} disabled={!canAddToCart} title={canAddToCart ? "Add to cart" : "Maximum available stock is already in your cart"} className="w-8 h-8 rounded-card bg-amber text-gunmetal font-bold hover:bg-amber/80 disabled:opacity-40 disabled:cursor-not-allowed">+</button>
        ) : (
          <button onClick={() => onAddToWaitlist(product)} disabled={isWaitlisted || (waitlistUserRole && waitlistUserRole !== "CUSTOMER")} className="text-[11px] font-semibold border border-gray-700 rounded-card px-3 py-1.5 hover:border-amber hover:text-amber disabled:border-olive/50 disabled:text-olive disabled:cursor-default">{isWaitlisted ? "Added to waitlist ✓" : waitlistUserRole === "CUSTOMER" ? "Add me to waitlist" : waitlistUserRole ? "Customer waitlist only" : "Log in to join waitlist"}</button>
        )}
      </div>
    </article>
  );
}

function ProductSection({ title, products, cart, onAddToCart, waitlist, waitlistOwner, onAddToWaitlist, waitlistUserRole }) {
  return (
    <section className="shop-product-section">
      <h2 className="font-heading text-xl mb-6">{title}</h2>
      <div className="shop-product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantityInCart={cart.find((item) => item.productId === product.id)?.quantity ?? 0}
            onAddToCart={onAddToCart}
            isWaitlisted={waitlist.some((entry) => entry.productId === product.id && entry.owner === waitlistOwner)}
            onAddToWaitlist={onAddToWaitlist}
            waitlistUserRole={waitlistUserRole}
          />
        ))}
      </div>
    </section>
  );
}

export default function Shop() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("onedepot_cart") || "[]"));
  const [currentShopUser] = useState(shopUser);
  const waitlistOwner = currentShopUser?.role === "CUSTOMER" ? `user-${currentShopUser.id}` : null;
  const [waitlist, setWaitlist] = useState(() => JSON.parse(localStorage.getItem("onedepot_waitlist") || "[]"));

  useEffect(() => {
    api.get("/products", { params: { search, category } }).then((response) => setProducts(response.data)).catch(() => setProducts([]));
  }, [search, category]);

  function addToCart(product) {
    const next = [...cart];
    const existing = next.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= Number(product.quantity)) return;
      existing.quantity += 1;
      existing.availableQuantity = Number(product.quantity);
    } else {
      next.push({ productId: product.id, name: product.name, price: product.price, quantity: 1, availableQuantity: Number(product.quantity) });
    }
    setCart(next);
    localStorage.setItem("onedepot_cart", JSON.stringify(next));
  }

  function addToWaitlist(product) {
    if (!currentShopUser) { navigate("/login"); return; }
    if (currentShopUser.role !== "CUSTOMER") return;
    if (waitlist.some((entry) => entry.productId === product.id && entry.owner === waitlistOwner)) return;
    const next = [...waitlist, { productId: product.id, productName: product.name, owner: waitlistOwner, addedAt: new Date().toISOString() }];
    setWaitlist(next);
    localStorage.setItem("onedepot_waitlist", JSON.stringify(next));
  }

  const showFeatured = !search.trim() && !category;
  const featuredProducts = showFeatured
    ? sortProducts(featuredCategoryOrder
        .map((featuredCategory) => products.find((product) => product.category === featuredCategory && Number(product.quantity) > 0))
        .filter(Boolean)
        .slice(0, 4), sortBy)
    : [];
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  const visibleSections = [
    ...(featuredProducts.length ? [{ title: "Featured", products: featuredProducts }] : []),
    ...shopSections
      .map((section) => ({
        title: section.title,
        products: sortProducts(products.filter((product) => section.categories.includes(product.category) && !featuredIds.has(product.id)), sortBy),
      }))
      .filter((section) => section.products.length),
  ];

  return (
    <div className="min-h-screen">
      <Navbar cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />

      <header className="px-6 py-10 max-w-[1248px] mx-auto">
        <p className="text-xs text-amber tracking-widest mb-2 font-mono-data">IN-STOCK AND READY TO SHIP</p>
        <h1 className="font-heading text-4xl leading-tight mb-3">Gear up. <br />Check stock <span className="text-amber">before</span> you walk in.</h1>
        <p className="text-gray-400 text-sm mb-6">Browse the full inventory, see what&apos;s on the shelf right now, and pay with GCash when you check out.</p>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search airsoft parts, gear, accessories" className="w-full bg-panel border border-gray-700 rounded-card px-4 py-2.5 text-sm focus:outline-none focus:border-amber" />
      </header>

      <main className="px-6 pb-16">
        <div className="shop-filter-toolbar">
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                onClick={() => setCategory(option.value)}
                className={`px-3 py-2 rounded-card border text-[11px] font-bold uppercase tracking-wider transition-colors ${category === option.value ? "bg-amber border-amber text-gunmetal" : "bg-panel border-gray-700 text-gray-300 hover:border-amber hover:text-amber"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full sm:w-60 shrink-0 bg-panel border border-gray-700 rounded-card px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-amber">
            <option value="">Sort by: Recommended</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="best-sellers">Best sellers</option>
            <option value="alpha-asc">Alphabetical: A–Z</option>
            <option value="alpha-desc">Alphabetical: Z–A</option>
          </select>
        </div>

        <div className="space-y-14">
          {visibleSections.map((section) => (
            <ProductSection key={section.title} title={section.title} products={section.products} cart={cart} onAddToCart={addToCart} waitlist={waitlist} waitlistOwner={waitlistOwner} onAddToWaitlist={addToWaitlist} waitlistUserRole={currentShopUser?.role ?? null} />
          ))}
          {products.length === 0 && <p className="text-gray-500 text-sm mt-4">No products found.</p>}
        </div>
      </main>
    </div>
  );
}
