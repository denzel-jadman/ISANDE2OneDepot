import demoApi from "./api.js";
import { inventoryApi, inventoryMode } from "./inventoryApi.js";

export const cartStorageKey = inventoryMode ? "onedepot_inventory_cart" : "onedepot_cart";

export function readCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(cartStorageKey) ?? "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

export function fetchShopProducts(config) {
  return inventoryMode ? inventoryApi.get("/catalog", config) : demoApi.get("/products", config);
}
