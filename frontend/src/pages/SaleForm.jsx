import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import RemoteSelect from "@/components/ui/RemoteSelect";
import ProductSelect from "@/components/ui/ProductSelect";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { post } from "@/utils/request";
import { formatQty, formatRupiah, parseDecimal, today } from "@/utils/format";

const emptyRow = () => ({ product_id: "", unit_symbol: "", stock: null, quantity: "", unit_price: "" });
const n = (v) => parseDecimal(v) ?? 0;

export default function SaleForm({ onClose, onSaved }) {
  const [head, setHead] = useState({ customer_id: "", sale_date: today(), invoice_no: "", note: "", discount: "", extra_cost: "", paid_amount: "" });
  const [items, setItems] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const setRow = (i, patch) => setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const pickProduct = (i, id, p) => {
    setRow(i, {
      product_id: id,
      unit_symbol: p?.unit_symbol || "",
      stock: p?.stock !== undefined ? Number(p.stock) : null,
      unit_price: p && !items[i].unit_price ? String(p.sell_price || p.cost_price || "") : items[i].unit_price,
    });
  };

  const subtotal = items.reduce((a, r) => a + n(r.quantity) * n(r.unit_price), 0);
  const total = subtotal - n(head.discount) + n(head.extra_cost);

  const submit = async (e) => {
    e.preventDefault();
    for (const [i, r] of items.entries()) {
      if (!r.product_id) return toast.error(`Barang baris ${i + 1} belum dipilih`);
      const qty = parseDecimal(r.quantity);
      if (!(qty > 0)) return toast.error(`Jumlah baris ${i + 1} harus lebih dari 0`);
      if (r.stock !== null && qty > r.stock) {
        return toast.error(`Stok baris ${i + 1} tidak mencukupi (tersedia ${formatQty(r.stock)})`);
      }
      if (parseDecimal(r.unit_price) === null || parseDecimal(r.unit_price) < 0) {
        return toast.error(`Harga baris ${i + 1} tidak valid`);
      }
    }
    for (const k of ["discount", "extra_cost", "paid_amount"]) {
      if (head[k] !== "" && (parseDecimal(head[k]) === null || parseDecimal(head[k]) < 0)) {
        return toast.error("Diskon/biaya/pembayaran harus angka valid");
      }
    }
    if (total < 0) return toast.error("Total tidak boleh negatif");

    setSaving(true);
    try {
      const res = await post(API_ENDPOINTS.SALES.LIST, {
        ...head,
        customer_id: head.customer_id || null,
        discount: n(head.discount),
        extra_cost: n(head.extra_cost),
        paid_amount: head.paid_amount === "" ? total : n(head.paid_amount),
        items: items.map((r) => ({ product_id: r.product_id, quantity: n(r.quantity), unit_price: n(r.unit_price) })),
      }, { success: "Penjualan tersimpan, stok berhasil dikurangi" });
      onSaved(res?.data?.id);
    } catch {
      /* toast error otomatis ditangani oleh request */
    } finally {
      setSaving(false);
    }
  };

  const L = ({ children }) => <label className="mb-1 block text-sm font-medium text-slate-700">{children}</label>;

  return (
    <Modal title="Penjualan Baru" size="xl" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <L>Customer (Pelanggan)</L>
            <RemoteSelect
              endpoint={API_ENDPOINTS.CUSTOMERS.LIST}
              value={head.customer_id}
              onChange={(v) => setHead({ ...head, customer_id: v })}
              getLabel={(c) => `${c.name}${c.phone ? ` (${c.phone})` : ""}`}
              placeholder="Cari customer (kosongkan: Umum)..."
            />
          </div>
          <div><L>Tanggal *</L><input type="date" className="input" value={head.sale_date} onChange={(e) => setHead({ ...head, sale_date: e.target.value })} /></div>
          <div><L>No. Nota / Struk</L><input className="input" placeholder="Opsional" value={head.invoice_no} onChange={(e) => setHead({ ...head, invoice_no: e.target.value })} /></div>
          <div><L>Catatan</L><input className="input" placeholder="Keterangan transaksi" value={head.note} onChange={(e) => setHead({ ...head, note: e.target.value })} /></div>
        </div>

        <div className="space-y-2">
          <div className="hidden grid-cols-12 gap-2 text-xs font-medium uppercase text-slate-500 md:grid">
            <span className="col-span-5">Barang</span>
            <span className="col-span-2">Jumlah</span>
            <span className="col-span-2">Harga Jual</span>
            <span className="col-span-2 text-right">Subtotal</span>
          </div>
          {items.map((r, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 p-2 md:border-0 md:p-0">
              <div className="col-span-12 md:col-span-5">
                <ProductSelect
                  value={r.product_id}
                  onChange={(id, p) => pickProduct(i, id, p)}
                  placeholder="Cari nama barang atau kode..."
                  checkStock
                />
              </div>
              <div className="relative col-span-6 md:col-span-2">
                <input
                  className="input !pr-10"
                  inputMode="decimal"
                  placeholder="0"
                  value={r.quantity}
                  onChange={(e) => setRow(i, { quantity: e.target.value })}
                />
                {r.unit_symbol && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{r.unit_symbol}</span>}
              </div>
              <div className="col-span-6 md:col-span-2">
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="Rp"
                  value={r.unit_price}
                  onChange={(e) => setRow(i, { unit_price: e.target.value })}
                />
              </div>
              <div className="col-span-10 text-right text-sm font-medium md:col-span-2">
                {formatRupiah(n(r.quantity) * n(r.unit_price))}
              </div>
              <button
                type="button"
                className="col-span-2 justify-self-end rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 md:col-span-1"
                disabled={items.length === 1}
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                aria-label="Hapus baris"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => setItems([...items, emptyRow()])}>
            <Plus size={16} /> Tambah barang
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div><L>Diskon (Rp)</L><input className="input" inputMode="decimal" placeholder="0" value={head.discount} onChange={(e) => setHead({ ...head, discount: e.target.value })} /></div>
          <div><L>Biaya Tambahan / Ongkir (Rp)</L><input className="input" inputMode="decimal" placeholder="0" value={head.extra_cost} onChange={(e) => setHead({ ...head, extra_cost: e.target.value })} /></div>
          <div><L>Jumlah Dibayar (Rp)</L><input className="input" inputMode="decimal" placeholder={formatRupiah(total)} value={head.paid_amount} onChange={(e) => setHead({ ...head, paid_amount: e.target.value })} /></div>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
          <div className="text-sm text-slate-500">
            Subtotal {formatRupiah(subtotal)} · Total <span className="text-lg font-semibold text-slate-800">{formatRupiah(total)}</span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />} Simpan & Potong Stok
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

