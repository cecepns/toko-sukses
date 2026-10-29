import { useState } from "react";
import { Eye, Printer } from "lucide-react";
import toast from "react-hot-toast";
import CrudPage from "@/components/crud/CrudPage";
import { salesConfig } from "@/config/pages";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get } from "@/utils/request";
import SaleForm from "./SaleForm";
import SaleDetail from "./SaleDetail";
import ReceiptModal from "@/components/receipt/ReceiptModal";

export default function Sales() {
  const [detailId, setDetailId] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [version, setVersion] = useState(0);

  const openReceipt = async (id) => {
    try {
      const res = await get(API_ENDPOINTS.SALES.DETAIL(id));
      if (res?.data) {
        setReceiptData(res.data);
      }
    } catch {
      toast.error("Gagal memuat data struk");
    }
  };

  return (
    <>
      <CrudPage
        config={salesConfig}
        CustomForm={({ onClose, onSaved }) => (
          <SaleForm
            onClose={onClose}
            onSaved={(newId) => {
              onSaved();
              if (newId) openReceipt(newId);
            }}
          />
        )}
        reloadKey={version}
        rowActions={(row) => (
          <div className="flex items-center gap-1">
            <button
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
              onClick={() => openReceipt(row.id)}
              aria-label="Cetak Struk"
              title="Cetak Struk"
            >
              <Printer size={16} />
            </button>
            <button
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
              onClick={() => setDetailId(row.id)}
              aria-label="Detail Penjualan"
              title="Lihat Detail"
            >
              <Eye size={16} />
            </button>
          </div>
        )}
      />

      {detailId && (
        <SaleDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}

      {receiptData && (
        <ReceiptModal
          sale={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </>
  );
}

