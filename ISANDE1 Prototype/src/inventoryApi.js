import axios from "axios";

export const inventoryMode = import.meta.env.MODE === "inventory";
export const inventoryApi = axios.create({ baseURL: "/api/inventory" });
export const lastOrderKey = "onedepot_last_order";
