import { useEffect, useState } from "react";
import { CreditCard, Loader2, Printer } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { PaymentBadge, StatusBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, post } from "@/utils/request";
import { confirmToast } from "@/utils/confirm";
import toast from "react-hot-toast";
import { formatDate, formatQty, formatRupiah } from "@/utils/format";
import ReceiptModal from "@/components/receipt/ReceiptModal";
import UpdatePaymentModal from "@/components/payment/UpdatePaymentModal";

export default function SaleDetail({ id, onClose, onChanged }) {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const loadDetail = () => {
    get(API_ENDPOINTS.SALES.DETAIL(id))
      .then((r) => setData(r.data))
      .catch(onClose);
  };

  useEffect(() => {
    loadDetail();
    /* eslint-disable-next-line */
  }, [id]);

  const cancel = async () => {
    if (!reason.trim()) return toast.error("Alasan pembatalan wajib diisi");
    if (!(await confirmToast("Batalkan penjualan ini? Stok barang akan dikembalikan.", "Ya, batalkan"))) return;
    setCancelling(true);
    try {
      await post(API_ENDPOINTS.SALES.CANCEL(id), { reason }, { success: "Penjualan dibatalkan, stok dikembalikan" });
      onChanged();
      onClose();
    } catch {
      /* toast error otomatis ditangani oleh request */
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <Modal title="Detail Penjualan" size="lg" onClose={onClose}>
        {!data ? (
          <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <p className="text-base font-bold text-slate-900">{data.number}</p>
                <p className="text-xs text-slate-500">{formatDate(data.sale_date)}</p>
              </div>
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5 !px-3 !py-1.5 text-xs shadow-sm"
                onClick={() => setShowReceipt(true)}
              >
                <Printer size={16} />
                <span>Cetak Struk Kasir</span>
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="text-slate-500">Customer:</span> <b>{data.customer_name}</b> {data.customer_phone ? `(${data.customer_phone})` : ""}</p>
              <p><span className="text-slate-500">No. Nota:</span> {data.invoice_no || "-"}</p>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-slate-500">Status:</span>
                <StatusBadge value={data.status} />
                <PaymentBadge value={data.payment_status} />
                {data.status === "confirmed" && (
                  <button
                    type="button"
                    className="btn-secondary !px-2 !py-0.5 text-xs inline-flex items-center gap-1 shadow-sm"
                    onClick={() => setShowPaymentModal(true)}
                    title="Ubah Status Pembayaran / Pelunasan"
                  >
                    <CreditCard size={13} />
                    <span>Update Status Pembayaran</span>
                  </button>
                )}
              </p>
              <p><span className="text-slate-500">Kasir:</span> {data.user_name || "-"}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-2">Barang</th>
                    <th className="p-2 text-right">Jumlah</th>
                    <th className="p-2 text-right">Harga Jual</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((i) => (
                    <tr key={i.id}>
                      <td className="p-2">{i.product_name}</td>
                      <td className="p-2 text-right">{formatQty(i.quantity)} {i.unit_symbol}</td>
                      <td className="p-2 text-right">{formatRupiah(i.unit_price)}</td>
                      <td className="p-2 text-right">{formatRupiah(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-xs space-y-1">
              <p className="flex justify-between"><span className="text-slate-500">Subtotal</span>{formatRupiah(data.subtotal)}</p>
              {Number(data.discount) > 0 && <p className="flex justify-between text-rose-600"><span className="text-slate-500">Diskon</span>-{formatRupiah(data.discount)}</p>}
              {Number(data.extra_cost) > 0 && <p className="flex justify-between"><span className="text-slate-500">Biaya Tambahan</span>+{formatRupiah(data.extra_cost)}</p>}
              <p className="flex justify-between border-t pt-1 text-base font-semibold"><span>Total</span>{formatRupiah(data.total)}</p>
              <p className="flex justify-between"><span className="text-slate-500">Dibayar</span>{formatRupiah(data.paid_amount)}</p>
            </div>

            {data.note && <p><span className="text-slate-500">Catatan:</span> {data.note}</p>}
            {data.status === "cancelled" && (
              <p className="rounded-lg bg-rose-50 p-3 text-rose-700">
                Dibatalkan: {data.cancel_reason}
              </p>
            )}

            {data.status === "confirmed" && isAdmin && (
              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row">
                <input
                  className="input"
                  placeholder="Alasan pembatalan penjualan"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <button className="btn-danger whitespace-nowrap" onClick={cancel} disabled={cancelling}>
                  Batalkan Penjualan
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {showReceipt && data && (
        <ReceiptModal sale={data} onClose={() => setShowReceipt(false)} />
      )}

      {showPaymentModal && data && (
        <UpdatePaymentModal
          type="sale"
          data={data}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            loadDetail();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}

