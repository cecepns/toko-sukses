import { Boxes, FileBarChart, History, LayoutDashboard, Package, PackageMinus, PackagePlus, Receipt, Ruler, ShoppingCart, SlidersHorizontal, Tags, Truck, UserCog, Users } from "lucide-react";

export const NAV = [
  { items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Data Master",
    items: [
      { to: "/products", label: "Data Barang", icon: Package },
      { to: "/categories", label: "Kategori Barang", icon: Tags },
      { to: "/units", label: "Satuan Barang", icon: Ruler },
      { to: "/suppliers", label: "Data Supplier", icon: Truck },
      { to: "/customers", label: "Data Customer", icon: Users },
    ],
  },
  {
    label: "Transaksi",
    items: [
      { to: "/purchases", label: "Pembelian Barang", icon: ShoppingCart },
      { to: "/stock-in", label: "Barang Masuk", icon: PackagePlus },
      { to: "/stock-out", label: "Barang Keluar", icon: PackageMinus },
      { to: "/stock-adjust", label: "Penyesuaian Stok", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Laporan",
    items: [
      { to: "/reports/stock", label: "Laporan Stok", icon: Boxes },
      { to: "/reports/purchases", label: "Laporan Pembelian", icon: Receipt },
      { to: "/reports/stock-card", label: "Kartu Stok", icon: History },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { to: "/users", label: "Data Pengguna & Akun", icon: UserCog, adminOnly: true },
    ],
  },
];
