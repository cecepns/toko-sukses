export const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);

/** Kuantitas desimal gaya Indonesia: 12.75 -> "12,75" */
export const formatQty = (n) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(Number(n) || 0);

export const formatDate = (d) =>
  d ? new Date(String(d).replace(" ", "T")).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

/** Terima "12,5" maupun "12.5"; kembalikan number atau null jika tidak valid. */
export const parseDecimal = (v) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "" || !/^-?\d*\.?\d+$/.test(s)) return null;
  return Number(s);
};

export const today = () => new Date().toISOString().slice(0, 10);
