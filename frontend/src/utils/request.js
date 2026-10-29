import toast from "react-hot-toast";
import { api } from "./api";

export const getErrorMessage = (e) =>
  e?.response?.data?.message || (e?.code === "ERR_NETWORK" ? "Tidak dapat terhubung ke server" : e?.message) || "Terjadi kesalahan";

export async function request(config, { success, silent } = {}) {
  try {
    const { data } = await api.request(config);
    if (success) toast.success(success);
    return data;
  } catch (e) {
    if (!silent) toast.error(getErrorMessage(e));
    throw e;
  }
}

export const get = (url, params, opts) => request({ method: "get", url, params }, opts);
export const post = (url, data, opts) => request({ method: "post", url, data }, opts);
export const put = (url, data, opts) => request({ method: "put", url, data }, opts);
export const del = (url, opts) => request({ method: "delete", url }, opts);

/** Ambil semua halaman (untuk export). */
export async function fetchAll(url, params = {}) {
  let page = 1, totalPages = 1, rows = [];
  do {
    const res = await get(url, { ...params, page, limit: 100 });
    rows = rows.concat(res.data);
    totalPages = res.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return rows;
}
