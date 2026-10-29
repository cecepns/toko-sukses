import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Package, ShoppingCart, Wallet } from "lucide-react";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, getErrorMessage } from "@/utils/request";
import { formatDate, formatQty, formatRupiah } from "@/utils/format";
import { StatusBadge } from "@/components/ui/Badge";

const Stat = ({ icon: Icon, label, value, tone }) => (
  <div className="card flex items-center gap-3 p-4">
    <div className={`rounded-lg p-2.5 ${tone}`}><Icon size={20} /></div>
    <div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-semibold">{value}</p></div>
  </div>
);

export default function Dashboard() {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const load = () => {
    setState({ loading: true, data: null, error: null });
    get(API_ENDPOINTS.DASHBOARD, null, { silent: true })
      .then((r) => setState({ loading: false, data: r.data, error: null }))
      .catch((e) => setState({ loading: false, data: null, error: getErrorMessage(e) }));
  };
  useEffect(load, []);

  if (state.loading) return <div className="flex justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>;
  if (state.error) return <div className="card p-8 text-center"><p className="text-slate-600">{state.error}</p><button className="btn-ghost mt-3" onClick={load}>Coba lagi</button></div>;

  const d = state.data;
  const max = Math.max(1, ...d.monthly.map((m) => Number(m.total)));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Package} label="Total jenis barang" value={d.total_products} tone="bg-indigo-100 text-indigo-600" />
        <Stat icon={AlertTriangle} label="Stok menipis" value={d.low_stock} tone="bg-rose-100 text-rose-600" />
        <Stat icon={Wallet} label="Nilai persediaan" value={formatRupiah(d.inventory_value)} tone="bg-emerald-100 text-emerald-600" />
        <Stat icon={ShoppingCart} label="Pembelian bulan ini" value={formatRupiah(d.purchases_month)} tone="bg-sky-100 text-sky-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h2 className="mb-1 font-semibold">Pembelian 6 bulan terakhir</h2>
          <p className="mb-4 text-xs text-slate-500">Hari ini: {formatRupiah(d.purchases_today)}</p>
          {d.monthly.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Belum ada pembelian</p> : (
            <div className="flex h-44 items-end gap-3">
              {d.monthly.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={formatRupiah(m.total)}>
                  <div className="w-full rounded-t bg-indigo-500" style={{ height: `${(Number(m.total) / max) * 100}%`, minHeight: 4 }} />
                  <span className="text-xs text-slate-500">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Total stok per satuan</h2>
          <ul className="space-y-2 text-sm">
            {d.perUnit.map((u) => <li key={u.symbol} className="flex justify-between"><span className="text-slate-500">{u.symbol}</span><span className="font-medium">{formatQty(u.total)}</span></li>)}
            {d.perUnit.length === 0 && <li className="text-slate-500">Belum ada data</li>}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Pembelian terbaru</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {d.recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div><p className="font-medium">{p.number}</p><p className="text-xs text-slate-500">{p.supplier_name} · {formatDate(p.purchase_date)}</p></div>
                <div className="text-right"><p>{formatRupiah(p.total)}</p><StatusBadge value={p.status} /></div>
              </li>
            ))}
            {d.recent.length === 0 && <li className="py-6 text-center text-slate-500">Belum ada pembelian</li>}
          </ul>
        </div>
        <div className="card p-4">
          <h2 className="mb-3 font-semibold">Notifikasi stok minimum</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {d.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-rose-600">{formatQty(p.stock)} / min {formatQty(p.min_stock)} {p.unit_symbol}</span>
              </li>
            ))}
            {d.lowStock.length === 0 && <li className="py-6 text-center text-slate-500">Semua stok aman</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
