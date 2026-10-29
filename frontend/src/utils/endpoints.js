/**
 * Endpoint Base URL API backend:
 * Menggunakan environment variable VITE_API_URL jika tersedia,
 * atau default ke endpoint produksi: https://api.kingcreativestudio.my.id/toko-sukses
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://api.kingcreativestudio.my.id/toko-sukses"
).replace(/\/+$/, "");

/** Helper untuk menyusun URL endpoint lengkap jika diperlukan */
export const getApiUrl = (path = "") => {
  const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${API_BASE_URL}${cleanPath}`;
};

const crud = (base) => ({ LIST: base, DETAIL: (id) => `${base}/${id}` });

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PROFILE: "/auth/profile",
    CHANGE_PASSWORD: "/auth/change-password",
  },
  DASHBOARD: "/dashboard",
  USERS: crud("/users"),
  CATEGORIES: crud("/categories"),
  UNITS: crud("/units"),
  PRODUCTS: crud("/products"),
  SUPPLIERS: crud("/suppliers"),
  CUSTOMERS: crud("/customers"),
  PURCHASES: { ...crud("/purchases"), CANCEL: (id) => `/purchases/${id}/cancel` },
  SALES: { ...crud("/sales"), CANCEL: (id) => `/sales/${id}/cancel` },
  STOCK_MOVEMENTS: crud("/stock-movements"),
};
