import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { PaymentBadge, StatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, post } from "@/utils/request";
import { confirmToast } from "@/utils/confirm";
import toast from "react-hot-toast";
import { formatDate, formatQty, formatRupiah } from "@/utils/format";

export default function PurchaseDetail({ id, onClose, onChanged }) {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => { get(API_ENDPOINTS.PURCHASES.DETAIL(id)).then((r) => setData(r.data)).catch(onClose); /* eslint-disable-next-line */ }, [id]);

  const cancel = async () => {
    if (!reason.trim()) return toast.error("Alasan pembatalan wajib diisi");
    if (!(await confirmToast("Batalkan pembelian ini? Stok akan dikurangi kembali.", "Ya, batalkan"))) return;
    setCancelling(true);
    try { await post(API_ENDPOINTS.PURCHASES.CANCEL(id), { reason }, { success: "Pembelian dibatalkan" }); onChanged(); onClose(); }
    catch { /* toast */ } finally { setCancelling(false); }
  };

  return (
    <Modal title="Detail Pembelian" size="lg" onClose={onClose}>
      {!data ? <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div> : (
        <div className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <p><span className="text-slate-500">No:</span> <b>{data.number}</b></p>
            <p><span className="text-slate-500">Tanggal:</span> {formatDate(data.purchase_date)}</p>
            <p><span className="text-slate-500">Supplier:</span> {data.supplier_name}</p>
            <p><span className="text-slate-500">No. Nota:</span> {data.invoice_no || "-"}</p>
            <p className="flex items-center gap-2"><span className="text-slate-500">Status:</span><StatusBadge value={data.status} /><PaymentBadge value={data.payment_status} /></p>
            <p><span className="text-slate-500">Dicatat oleh:</span> {data.user_name || "-"}</p>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">Barang</th><th className="p-2 text-right">Jumlah</th><th className="p-2 text-right">Harga</th><th className="p-2 text-right">Subtotal</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{data.items.map((i) => (
              <tr key={i.id}><td className="p-2">{i.product_name}</td><td className="p-2 text-right">{formatQty(i.quantity)} {i.unit_symbol}</td><td className="p-2 text-right">{formatRupiah(i.unit_price)}</td><td className="p-2 text-right">{formatRupiah(i.subtotal)}</td></tr>
            ))}</tbody>
          </table></div>
          <div className="ml-auto max-w-xs space-y-1">
            <p className="flex justify-between"><span className="text-slate-500">Subtotal</span>{formatRupiah(data.subtotal)}</p>
            <p className="flex justify-between"><span className="text-slate-500">Diskon</span>-{formatRupiah(data.discount)}</p>
            <p className="flex justify-between"><span className="text-slate-500">Biaya tambahan</span>{formatRupiah(data.extra_cost)}</p>
            <p className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span>{formatRupiah(data.total)}</p>
            <p className="flex justify-between"><span className="text-slate-500">Dibayar</span>{formatRupiah(data.paid_amount)}</p>
          </div>
          {data.note && <p><span className="text-slate-500">Catatan:</span> {data.note}</p>}
          {data.status === "cancelled" && <p className="rounded-lg bg-rose-50 p-3 text-rose-700">Dibatalkan: {data.cancel_reason}</p>}
          {data.status === "confirmed" && isAdmin && (
            <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row">
              <input className="input" placeholder="Alasan pembatalan" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="btn-danger whitespace-nowrap" onClick={cancel} disabled={cancelling}>Batalkan Pembelian</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
