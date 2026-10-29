import { useState } from "react";
import { Bluetooth, Check, Copy, Download, MessageCircle, Printer, X } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import { formatDate, formatQty, formatRupiah } from "@/utils/format";
import {
  downloadReceiptPdf,
  formatWhatsAppReceipt,
  printBluetoothThermal,
  printViaIsolatedIframe,
} from "@/utils/receiptPrinter";

export default function ReceiptModal({ sale, onClose }) {
  const [printingBt, setPrintingBt] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const handlePrintBluetooth = async () => {
    setPrintingBt(true);
    const toastId = toast.loading("Mencari & menghubungkan ke printer Bluetooth...");
    try {
      await printBluetoothThermal(sale, { cols: 32 });
      toast.success("Struk berhasil dikirim ke printer Bluetooth!", { id: toastId });
    } catch (err) {
      if (err.name === "NotFoundError" || err.message?.includes("User cancelled")) {
        toast.dismiss(toastId);
      } else {
        toast.error(err.message || "Gagal mencetak ke printer Bluetooth", { id: toastId });
      }
    } finally {
      setPrintingBt(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      downloadReceiptPdf(sale);
      toast.success("PDF Struk berhasil diunduh!");
    } catch (err) {
      toast.error("Gagal membuat PDF struk: " + err.message);
    }
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(formatWhatsAppReceipt(sale));
    const rawPhone = sale.customer_phone ? String(sale.customer_phone).replace(/\D/g, "") : "";
    let phone = rawPhone;
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(formatWhatsAppReceipt(sale));
      setCopied(true);
      toast.success("Teks struk disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin teks struk");
    }
  };

  const handlePrintIframe = () => {
    printViaIsolatedIframe(sale);
  };

  const change = Number(sale.paid_amount) - Number(sale.total);

  return (
    <Modal title={`Cetak Struk - ${sale.number}`} size="md" onClose={onClose}>
      <div className="space-y-4">
        {/* Tombol Opsi Cetak & Bagikan */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
            onClick={handlePrintBluetooth}
            disabled={printingBt}
            title="Koneksikan langsung ke printer thermal Bluetooth (POS-58/80)"
          >
            <Bluetooth size={20} className={printingBt ? "animate-pulse" : ""} />
            <span>Thermal Bluetooth</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            onClick={handleDownloadPdf}
            title="Download file PDF struk thermal 58mm (tanpa dialog browser)"
          >
            <Download size={20} />
            <span>Unduh PDF</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
            onClick={handlePrintIframe}
            title="Cetak struk ke printer kasir USB/Driver (bebas tampilan halaman web)"
          >
            <Printer size={20} />
            <span>Cetak Biasa</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
            onClick={handleSendWhatsApp}
            title="Kirim rincian struk langsung ke nomor WhatsApp pelanggan"
          >
            <MessageCircle size={20} />
            <span>Kirim WhatsApp</span>
          </button>
        </div>

        {/* Preview Kertas Struk Thermal */}
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
          <div className="mx-auto max-w-[340px] rounded-lg border border-slate-300 bg-white p-5 font-mono text-xs text-slate-800 shadow-sm">
            {/* Header Struk */}
            <div className="text-center">
              <h3 className="text-base font-bold tracking-wider text-slate-900">CV CAH BEJO</h3>
              <p className="text-[11px] text-slate-500">Manajemen Stok, Pembelian & Penjualan</p>
            </div>

            <div className="my-2 border-t border-dashed border-slate-300" />

            {/* Meta Data Struk */}
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Nota:</span>
                <span className="font-semibold">{sale.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal:</span>
                <span>{formatDate(sale.sale_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium">{sale.customer_name || "Umum"}</span>
              </div>
              {sale.user_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Kasir:</span>
                  <span>{sale.user_name}</span>
                </div>
              )}
            </div>

            <div className="my-2 border-t border-dashed border-slate-300" />

            {/* List Barang */}
            <div className="space-y-2 text-[11px]">
              {(sale.items || []).map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <p className="font-semibold text-slate-900">{item.product_name}</p>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {formatQty(item.quantity)} {item.unit_symbol || ""} x {formatRupiah(item.unit_price)}
                    </span>
                    <span className="font-medium text-slate-800">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="my-2 border-t border-dashed border-slate-300" />

            {/* Rincian Angka */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatRupiah(sale.subtotal)}</span>
              </div>
              {Number(sale.discount) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(sale.discount)}</span>
                </div>
              )}
              {Number(sale.extra_cost) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Tambahan</span>
                  <span>+{formatRupiah(sale.extra_cost)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-slate-300 pt-1 text-sm font-bold text-slate-900">
                <span>TOTAL</span>
                <span>{formatRupiah(sale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dibayar</span>
                <span>{formatRupiah(sale.paid_amount)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Kembali</span>
                  <span>{formatRupiah(change)}</span>
                </div>
              )}
            </div>

            <div className="my-3 border-t border-dashed border-slate-300" />

            {/* Footer Struk */}
            <div className="text-center text-[11px] text-slate-500">
              <p className="font-bold text-indigo-700">
                {sale.status === "cancelled" ? "*** DIBATALKAN ***" : "*** LUNAS ***"}
              </p>
              <p className="mt-1">Terima kasih atas kunjungan Anda!</p>
              <p className="text-[10px] text-slate-400">
                Barang yang sudah dibeli tidak dapat ditukar/dikembalikan
              </p>
            </div>
          </div>
        </div>

        {/* Footer Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
            onClick={handleCopyText}
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? "Tersalin!" : "Salin Teks Struk"}</span>
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
}

