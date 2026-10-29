import { useState } from "react";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import { formatRupiah, parseDecimal } from "@/utils/format";
import { put } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";

export default function UpdatePaymentModal({ type = "sale", data, onClose, onSuccess }) {
  const isSale = type === "sale";
  const endpoint = isSale ? API_ENDPOINTS.SALES.DETAIL(data.id) : API_ENDPOINTS.PURCHASES.DETAIL(data.id);

  const total = Number(data.total) || 0;
  const initialPaid = Number(data.paid_amount) || 0;

  const [paidAmount, setPaidAmount] = useState(String(initialPaid));
  const [paymentStatus, setPaymentStatus] = useState(data.payment_status || "unpaid");
  const [note, setNote] = useState(data.note || "");
  const [invoiceNo, setInvoiceNo] = useState(data.invoice_no || "");
  const [saving, setSaving] = useState(false);

  // Helper untuk hitung sisa
  const currentPaid = Math.max(0, parseDecimal(paidAmount) ?? 0);
  const remaining = Math.max(0, total - currentPaid);

  const handleSetLunas = () => {
    setPaidAmount(String(total));
    setPaymentStatus("paid");
  };

  const handlePaidChange = (val) => {
    setPaidAmount(val);
    const n = parseDecimal(val) ?? 0;
    if (n >= total && total > 0) {
      setPaymentStatus("paid");
    } else if (n > 0) {
      setPaymentStatus("partial");
    } else {
      setPaymentStatus("unpaid");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const paidNum = parseDecimal(paidAmount);
    if (paidNum === null || paidNum < 0) {
      return toast.error("Nominal pembayaran tidak valid");
    }

    setSaving(true);
    try {
      await put(
        endpoint,
        {
          paid_amount: paidNum,
          payment_status: paymentStatus,
          note: note.trim() || null,
          invoice_no: invoiceNo.trim() || null,
        },
        { success: "Status pembayaran berhasil diperbarui" }
      );

      onSuccess?.();
      onClose();
    } catch {
      // Toast error otomatis ditangani oleh util request
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Update Pembayaran: ${data.number}`} size="md" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Info Ringkasan */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
            <span className="text-slate-600">Total Transaksi</span>
            <span className="text-base font-bold text-slate-900">{formatRupiah(total)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Nominal Terbayar:</span>
            <span className="font-semibold text-emerald-600">{formatRupiah(currentPaid)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-slate-500">Sisa Tagihan / Kekurangan:</span>
            <span className={`font-semibold ${remaining > 0 ? "text-rose-600" : "text-slate-700"}`}>
              {formatRupiah(remaining)}
            </span>
          </div>
        </div>

        {/* Input Nominal & Tombol Set Lunas */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">Nominal yang Sudah Dibayar</label>
            {remaining > 0 && (
              <button
                type="button"
                onClick={handleSetLunas}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <CheckCircle2 size={13} />
                Lunaskan Penuh ({formatRupiah(total)})
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            <input
              type="text"
              inputMode="decimal"
              className="input !pl-9"
              placeholder="0"
              value={paidAmount}
              onChange={(e) => handlePaidChange(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Status Pembayaran */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status Pembayaran</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "paid", label: "Lunas", color: "border-emerald-500 bg-emerald-50 text-emerald-700 ring-emerald-500" },
              { id: "partial", label: "DP / Sebagian", color: "border-amber-500 bg-amber-50 text-amber-700 ring-amber-500" },
              { id: "unpaid", label: "Belum Dibayar", color: "border-rose-500 bg-rose-50 text-rose-700 ring-rose-500" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setPaymentStatus(s.id)}
                className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all ${
                  paymentStatus === s.id
                    ? `${s.color} ring-2 ring-offset-1`
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* No Nota / Faktur */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">No. Nota / Faktur</label>
          <input
            type="text"
            className="input"
            placeholder="Nomor nota fisik atau referensi transfer"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />
        </div>

        {/* Catatan / Keterangan Pembayaran */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Catatan / Keterangan Pelunasan</label>
          <textarea
            rows={2}
            className="input"
            placeholder="Contoh: Sudah dilunasi via transfer BCA / Tunai kasir"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            Simpan Perubahan
          </button>
        </div>
      </form>
    </Modal>
  );
}

