const TONES = {
  green: "bg-emerald-100 text-emerald-700", red: "bg-rose-100 text-rose-700", amber: "bg-amber-100 text-amber-700",
  blue: "bg-sky-100 text-sky-700", slate: "bg-slate-100 text-slate-600",
};
export const Badge = ({ tone = "slate", children }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
);

const PAY = { unpaid: ["red", "Belum dibayar"], partial: ["amber", "Sebagian"], paid: ["green", "Lunas"] };
const STATUS = { confirmed: ["green", "Selesai"], cancelled: ["red", "Dibatalkan"] };
const MOVE = { opening: ["slate", "Stok awal"], purchase: ["blue", "Pembelian"], sale: ["amber", "Penjualan"], in: ["green", "Masuk"], out: ["amber", "Keluar"], adjust: ["slate", "Penyesuaian"], cancel: ["red", "Batal"] };
const ROLE = { admin: ["blue", "Admin"], staff: ["slate", "Staf"] };
const make = (map) => ({ value }) => <Badge tone={map[value]?.[0]}>{map[value]?.[1] || value}</Badge>;
export const PaymentBadge = make(PAY);
export const StatusBadge = make(STATUS);
export const MovementBadge = make(MOVE);
export const RoleBadge = make(ROLE);
export const UserStatusBadge = ({ value }) => (
  <Badge tone={value === 1 || value === "1" || value === true ? "green" : "red"}>
    {value === 1 || value === "1" || value === true ? "Aktif" : "Nonaktif"}
  </Badge>
);
