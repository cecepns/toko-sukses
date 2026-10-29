import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import RemoteSelect from "@/components/ui/RemoteSelect";
import { useOptions } from "@/hooks/useOptions";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { post } from "@/utils/request";
import { formatRupiah, parseDecimal, today } from "@/utils/format";

const emptyRow = () => ({ product_id: "", quantity: "", unit_price: "" });
const n = (v) => parseDecimal(v) ?? 0;

export default function PurchaseForm({ onClose, onSaved }) {
  const { rows: products } = useOptions(API_ENDPOINTS.PRODUCTS.LIST);
  const [head, setHead] = useState({ supplier_id: "", purchase_date: today(), invoice_no: "", note: "", discount: "", extra_cost: "", paid_amount: "" });
  const [items, setItems] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const setRow = (i, patch) => setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const pickProduct = (i, id) => {
    const p = products.find((x) => String(x.id) === String(id));
    setRow(i, { product_id: id, unit_price: p && !items[i].unit_price ? String(p.cost_price) : items[i].unit_price });
  };

  const subtotal = items.reduce((a, r) => a + n(r.quantity) * n(r.unit_price), 0);
  const total = subtotal - n(head.discount) + n(head.extra_cost);

  const submit = async (e) => {
    e.preventDefault();
    if (!head.supplier_id) return toast.error("Supplier wajib dipilih");
    for (const [i, r] of items.entries()) {
      if (!r.product_id) return toast.error(`Barang baris ${i + 1} belum dipilih`);
      if (!(parseDecimal(r.quantity) > 0)) return toast.error(`Jumlah baris ${i + 1} harus lebih dari 0`);
      if (parseDecimal(r.unit_price) === null) return toast.error(`Harga baris ${i + 1} tidak valid`);
    }
    for (const k of ["discount", "extra_cost", "paid_amount"]) {
      if (head[k] !== "" && (parseDecimal(head[k]) === null || parseDecimal(head[k]) < 0)) return toast.error("Diskon/biaya/pembayaran harus angka valid");
    }
    if (total < 0) return toast.error("Total tidak boleh negatif");
    setSaving(true);
    try {
      await post(API_ENDPOINTS.PURCHASES.LIST, {
        ...head, discount: n(head.discount), extra_cost: n(head.extra_cost), paid_amount: n(head.paid_amount),
        items: items.map((r) => ({ product_id: r.product_id, quantity: n(r.quantity), unit_price: n(r.unit_price) })),
      }, { success: "Pembelian tersimpan, stok bertambah" });
      onSaved();
    } catch { /* toast dari request */ } finally { setSaving(false); }
  };

  const L = ({ children }) => <label className="mb-1 block text-sm font-medium text-slate-700">{children}</label>;

  return (
    <Modal title="Pembelian Baru" size="xl" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><L>Supplier *</L><RemoteSelect endpoint={API_ENDPOINTS.SUPPLIERS.LIST} value={head.supplier_id} onChange={(v) => setHead({ ...head, supplier_id: v })} placeholder="Pilih supplier" /></div>
          <div><L>Tanggal *</L><input type="date" className="input" value={head.purchase_date} onChange={(e) => setHead({ ...head, purchase_date: e.target.value })} /></div>
          <div><L>No. Nota</L><input className="input" value={head.invoice_no} onChange={(e) => setHead({ ...head, invoice_no: e.target.value })} /></div>
          <div><L>Catatan</L><input className="input" value={head.note} onChange={(e) => setHead({ ...head, note: e.target.value })} /></div>
        </div>

        <div className="space-y-2">
          <div className="hidden grid-cols-12 gap-2 text-xs font-medium uppercase text-slate-500 md:grid">
            <span className="col-span-5">Barang</span><span className="col-span-2">Jumlah</span><span className="col-span-2">Harga/satuan</span><span className="col-span-2 text-right">Subtotal</span>
          </div>
          {items.map((r, i) => {
            const unit = products.find((p) => String(p.id) === String(r.product_id))?.unit_symbol;
            return (
              <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 p-2 md:border-0 md:p-0">
                <div className="col-span-12 md:col-span-5">
                  <select className="input" value={r.product_id} onChange={(e) => pickProduct(i, e.target.value)}>
                    <option value="">Pilih barang</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit_symbol})</option>)}
                  </select>
                </div>
                <div className="relative col-span-6 md:col-span-2">
                  <input className="input !pr-10" inputMode="decimal" placeholder="0" value={r.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} />
                  {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{unit}</span>}
                </div>
                <div className="col-span-6 md:col-span-2"><input className="input" inputMode="decimal" placeholder="Rp" value={r.unit_price} onChange={(e) => setRow(i, { unit_price: e.target.value })} /></div>
                <div className="col-span-10 text-right text-sm font-medium md:col-span-2">{formatRupiah(n(r.quantity) * n(r.unit_price))}</div>
                <button type="button" className="col-span-2 justify-self-end rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 md:col-span-1" disabled={items.length === 1} onClick={() => setItems(items.filter((_, idx) => idx !== i))} aria-label="Hapus baris"><Trash2 size={16} /></button>
              </div>
            );
          })}
          <button type="button" className="btn-ghost" onClick={() => setItems([...items, emptyRow()])}><Plus size={16} />Tambah barang</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div><L>Diskon (Rp)</L><input className="input" inputMode="decimal" value={head.discount} onChange={(e) => setHead({ ...head, discount: e.target.value })} /></div>
          <div><L>Biaya tambahan/pajak (Rp)</L><input className="input" inputMode="decimal" value={head.extra_cost} onChange={(e) => setHead({ ...head, extra_cost: e.target.value })} /></div>
          <div><L>Dibayar (Rp)</L><input className="input" inputMode="decimal" value={head.paid_amount} onChange={(e) => setHead({ ...head, paid_amount: e.target.value })} /></div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
          <div className="text-sm text-slate-500">Subtotal {formatRupiah(subtotal)} · Total <span className="text-lg font-semibold text-slate-800">{formatRupiah(total)}</span></div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Batal</button>
            <button className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />}Simpan & Tambah Stok</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
