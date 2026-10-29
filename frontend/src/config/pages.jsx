import { API_ENDPOINTS as E } from "@/utils/endpoints";
import { formatDate, formatQty, formatRupiah } from "@/utils/format";
import { Badge, MovementBadge, PaymentBadge, RoleBadge, StatusBadge, UserStatusBadge } from "@/components/ui/Badge";

const productLabel = (r) => `${r.name} (${r.unit_symbol || "-"})`;
const qtyWithUnit = (r, key = "stock") => `${formatQty(r[key])} ${r.unit_symbol || ""}`;

export const categoriesConfig = {
  title: "Kategori Barang", endpoint: E.CATEGORIES,
  columns: [{ key: "name", label: "Nama", sortKey: "name" }, { key: "description", label: "Keterangan" }],
  fields: [{ name: "name", label: "Nama kategori", required: true }, { name: "description", label: "Keterangan", type: "textarea" }],
};

export const unitsConfig = {
  title: "Satuan Barang", endpoint: E.UNITS,
  columns: [{ key: "name", label: "Nama", sortKey: "name" }, { key: "symbol", label: "Simbol" }],
  fields: [{ name: "name", label: "Nama satuan", required: true, placeholder: "Kilogram" }, { name: "symbol", label: "Simbol", required: true, placeholder: "kg" }],
};

export const suppliersConfig = {
  title: "Data Supplier", endpoint: E.SUPPLIERS,
  columns: [
    { key: "code", label: "Kode" }, { key: "name", label: "Nama", sortKey: "name" }, { key: "contact_name", label: "Kontak" },
    { key: "phone", label: "Telepon/WA" }, { key: "company", label: "Perusahaan" },
  ],
  fields: [
    { name: "code", label: "Kode supplier", placeholder: "Kosongkan untuk otomatis" },
    { name: "name", label: "Nama supplier", required: true }, { name: "contact_name", label: "Nama kontak" },
    { name: "phone", label: "Nomor telepon/WhatsApp" }, { name: "company", label: "Perusahaan" },
    { name: "address", label: "Alamat", type: "textarea" }, { name: "note", label: "Catatan", type: "textarea" },
  ],
};

export const customersConfig = {
  title: "Data Customer", endpoint: E.CUSTOMERS,
  columns: [{ key: "code", label: "Kode" }, { key: "name", label: "Nama", sortKey: "name" }, { key: "phone", label: "Telepon" }, { key: "address", label: "Alamat" }],
  fields: [
    { name: "code", label: "Kode customer", placeholder: "Kosongkan untuk otomatis" },
    { name: "name", label: "Nama customer", required: true }, { name: "phone", label: "Telepon" },
    { name: "address", label: "Alamat", type: "textarea" }, { name: "note", label: "Catatan", type: "textarea" },
  ],
};

const isLow = (r) => r.min_stock > 0 && r.stock <= r.min_stock;
const productFilters = [
  { name: "category_id", type: "remote", endpoint: E.CATEGORIES.LIST, placeholder: "Semua kategori" },
  { name: "supplier_id", type: "remote", endpoint: E.SUPPLIERS.LIST, placeholder: "Semua supplier" },
  { name: "low_stock", placeholder: "Semua stok", options: [{ value: "1", label: "Stok menipis" }] },
];

export const productsConfig = {
  title: "Data Barang", endpoint: E.PRODUCTS, filters: productFilters, exportName: "data-barang",
  columns: [
    { key: "code", label: "Kode" },
    { key: "name", label: "Nama barang", sortKey: "name" },
    { key: "category_name", label: "Kategori" },
    { key: "stock", label: "Stok", sortKey: "stock", align: "right", csv: (r) => qtyWithUnit(r),
      render: (r) => <span className="inline-flex items-center gap-2">{qtyWithUnit(r)}{isLow(r) && <Badge tone="red">Menipis</Badge>}</span> },
    { key: "cost_price", label: "Harga modal", sortKey: "cost_price", align: "right", render: (r) => formatRupiah(r.cost_price) },
    { key: "sell_price", label: "Harga jual", align: "right", render: (r) => formatRupiah(r.sell_price) },
  ],
  fields: [
    { name: "code", label: "Kode barang", placeholder: "Kosongkan untuk otomatis" },
    { name: "name", label: "Nama barang", required: true },
    { name: "category_id", label: "Kategori", type: "select", endpoint: E.CATEGORIES.LIST },
    { name: "unit_id", label: "Satuan", type: "select", endpoint: E.UNITS.LIST, getLabel: (r) => `${r.name} (${r.symbol})`, required: true },
    { name: "stock", label: "Stok awal", type: "decimal", createOnly: true, hint: "Boleh desimal, mis. 12,75. Perubahan stok berikutnya lewat menu transaksi." },
    { name: "cost_price", label: "Harga modal per satuan", type: "decimal" },
    { name: "sell_price", label: "Harga jual per satuan", type: "decimal" },
    { name: "min_stock", label: "Stok minimum", type: "decimal" },
    { name: "supplier_id", label: "Supplier utama", type: "select", endpoint: E.SUPPLIERS.LIST },
    { name: "description", label: "Keterangan", type: "textarea" },
  ],
};

const dateFilters = [{ name: "date_from", type: "date", label: "Dari" }, { name: "date_to", type: "date", label: "Sampai" }];
const productFilter = { name: "product_id", type: "remote", endpoint: E.PRODUCTS.LIST, getLabel: productLabel, placeholder: "Semua barang" };

const movementColumns = [
  { key: "created_at", label: "Tanggal", sortKey: "created_at", render: (r) => formatDate(r.created_at) },
  { key: "product_name", label: "Barang", csv: (r) => r.product_name },
  { key: "type", label: "Jenis", render: (r) => <MovementBadge value={r.type} />, csv: (r) => r.type },
  { key: "quantity", label: "Jumlah", align: "right", sortKey: "quantity", csv: (r) => qtyWithUnit(r, "quantity"),
    render: (r) => <span className={r.quantity < 0 ? "text-rose-600" : "text-emerald-600"}>{r.quantity > 0 ? "+" : ""}{qtyWithUnit(r, "quantity")}</span> },
  { key: "balance_after", label: "Saldo", align: "right", render: (r) => qtyWithUnit(r, "balance_after"), csv: (r) => qtyWithUnit(r, "balance_after") },
  { key: "note", label: "Keterangan" },
  { key: "user_name", label: "Oleh" },
];

const MOVE_TITLE = { in: "Barang Masuk", out: "Barang Keluar", adjust: "Penyesuaian Stok" };
const MOVE_SUB = {
  in: "Penambahan stok manual / retur. Barang dari pembelian supplier otomatis tercatat di sini — jangan diinput ulang.",
  out: "Pemakaian internal, barang rusak atau hilang. Stok tidak boleh menjadi negatif.",
  adjust: "Koreksi stok (+/-) hasil stock opname. Alasan wajib diisi.",
};

export const movementConfig = (kind) => ({
  title: MOVE_TITLE[kind], subtitle: MOVE_SUB[kind], endpoint: E.STOCK_MOVEMENTS, createLabel: "Catat",
  canEdit: true, canDelete: true, columns: movementColumns, filters: [productFilter, ...dateFilters],
  fields: [
    { name: "product_id", label: "Barang", type: "select", endpoint: E.PRODUCTS.LIST, getLabel: productLabel, required: true, createOnly: true },
    { name: "quantity", label: kind === "adjust" ? "Selisih stok (+/-)" : "Jumlah", type: "decimal", required: true, allowNegative: kind === "adjust", hint: "Pakai koma atau titik, mis. 2,5", createOnly: true },
    { name: "note", label: kind === "in" ? "Keterangan" : "Alasan", type: "textarea", required: kind !== "in" },
  ],
});

export const purchasesConfig = {
  title: "Pembelian Barang", subtitle: "Pembelian yang disimpan otomatis menambah stok dan mencatat kartu stok.",
  endpoint: E.PURCHASES, createLabel: "Pembelian Baru", canEdit: false, canDelete: true,
  filters: [
    { name: "supplier_id", type: "remote", endpoint: E.SUPPLIERS.LIST, placeholder: "Semua supplier" },
    { name: "payment_status", placeholder: "Semua pembayaran", options: [{ value: "unpaid", label: "Belum dibayar" }, { value: "partial", label: "Sebagian" }, { value: "paid", label: "Lunas" }] },
    ...dateFilters,
  ],
  columns: [
    { key: "number", label: "No. Pembelian", sortKey: "number" },
    { key: "purchase_date", label: "Tanggal", sortKey: "purchase_date", render: (r) => formatDate(r.purchase_date) },
    { key: "supplier_name", label: "Supplier" },
    { key: "total", label: "Total", sortKey: "total", align: "right", render: (r) => formatRupiah(r.total), csv: (r) => r.total },
    { key: "payment_status", label: "Pembayaran", render: (r) => <PaymentBadge value={r.payment_status} />, csv: (r) => r.payment_status },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} />, csv: (r) => r.status },
  ],
};

export const salesConfig = {
  title: "Penjualan Barang", subtitle: "Transaksi penjualan ke pelanggan. Stok otomatis berkurang dan tercatat di kartu stok.",
  endpoint: E.SALES, createLabel: "Penjualan Baru", canEdit: false, canDelete: true,
  filters: [
    { name: "customer_id", type: "remote", endpoint: E.CUSTOMERS.LIST, placeholder: "Semua customer" },
    { name: "payment_status", placeholder: "Semua pembayaran", options: [{ value: "paid", label: "Lunas" }, { value: "partial", label: "Sebagian" }, { value: "unpaid", label: "Belum dibayar" }] },
    ...dateFilters,
  ],
  columns: [
    { key: "number", label: "No. Penjualan", sortKey: "number" },
    { key: "sale_date", label: "Tanggal", sortKey: "sale_date", render: (r) => formatDate(r.sale_date) },
    { key: "customer_name", label: "Customer" },
    { key: "total", label: "Total", sortKey: "total", align: "right", render: (r) => formatRupiah(r.total), csv: (r) => r.total },
    { key: "payment_status", label: "Pembayaran", render: (r) => <PaymentBadge value={r.payment_status} />, csv: (r) => r.payment_status },
    { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} />, csv: (r) => r.status },
  ],
};

export const reportStockConfig = {
  title: "Laporan Stok & Nilai Persediaan", subtitle: "Stok terkini dan nilai persediaan (stok × harga modal).",
  endpoint: E.PRODUCTS, exportName: "laporan-stok", canCreate: false, canEdit: false, canDelete: false, filters: productFilters,
  columns: [
    ...productsConfig.columns.slice(0, 4),
    { key: "cost_price", label: "Harga modal", align: "right", render: (r) => formatRupiah(r.cost_price), csv: (r) => r.cost_price },
    { key: "stock_value", label: "Nilai persediaan", sortKey: "stock_value", align: "right", render: (r) => formatRupiah(r.stock_value), csv: (r) => r.stock_value },
  ],
};

export const reportPurchasesConfig = { ...purchasesConfig, title: "Laporan Pembelian", subtitle: "Filter berdasarkan supplier dan periode.", exportName: "laporan-pembelian", canCreate: false };

export const reportSalesConfig = { ...salesConfig, title: "Laporan Penjualan", subtitle: "Filter berdasarkan customer dan periode.", exportName: "laporan-penjualan", canCreate: false };

export const stockCardConfig = {
  title: "Kartu Stok", subtitle: "Seluruh riwayat perubahan stok. Pilih barang untuk melihat kartu stok per barang.",
  endpoint: E.STOCK_MOVEMENTS, exportName: "kartu-stok", canCreate: false, canEdit: false, canDelete: false,
  columns: movementColumns, filters: [productFilter, ...dateFilters],
};

export const usersConfig = {
  title: "Data Pengguna & Akun",
  subtitle: "Kelola akun pengguna, hak akses (Admin / Staf), status akun, serta reset password.",
  endpoint: E.USERS,
  exportName: "data-pengguna",
  filters: [
    { name: "role", placeholder: "Semua role", options: [{ value: "admin", label: "Admin" }, { value: "staff", label: "Staf" }] },
    { name: "is_active", placeholder: "Semua status", options: [{ value: "1", label: "Aktif" }, { value: "0", label: "Nonaktif" }] },
  ],
  columns: [
    { key: "name", label: "Nama Lengkap", sortKey: "name" },
    { key: "username", label: "Username", sortKey: "username" },
    { key: "role", label: "Hak Akses", render: (r) => <RoleBadge value={r.role} />, csv: (r) => r.role },
    { key: "is_active", label: "Status", render: (r) => <UserStatusBadge value={r.is_active} />, csv: (r) => (r.is_active ? "Aktif" : "Nonaktif") },
    { key: "created_at", label: "Dibuat", render: (r) => formatDate(r.created_at) },
  ],
  fields: [
    { name: "name", label: "Nama lengkap", required: true, placeholder: "Contoh: Budi Santoso" },
    {
      name: "username",
      label: "Username",
      required: true,
      minLength: 3,
      placeholder: "Contoh: budi123",
      hint: "Hanya huruf kecil, angka, titik, strip, atau underscore.",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      optionalOnEdit: true,
      minLength: 6,
      placeholder: "Minimal 6 karakter",
      hint: "Wajib diisi saat tambah pengguna baru. Kosongkan saat edit jika tidak ingin mengubah password.",
    },
    {
      name: "role",
      label: "Hak Akses / Role",
      options: [
        { value: "staff", label: "Staf (Akses operasional tanpa hak hapus/batal)" },
        { value: "admin", label: "Admin (Akses penuh)" },
      ],
      default: "staff",
      required: true,
    },
    {
      name: "is_active",
      label: "Status Akun",
      options: [
        { value: 1, label: "Aktif (Bisa login)" },
        { value: 0, label: "Nonaktif (Tidak bisa login)" },
      ],
      default: 1,
      required: true,
    },
  ],
};
