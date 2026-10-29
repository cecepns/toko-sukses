import { useState } from "react";
import { CreditCard, Eye } from "lucide-react";
import CrudPage from "@/components/crud/CrudPage";
import { purchasesConfig } from "@/config/pages";
import PurchaseForm from "./PurchaseForm";
import PurchaseDetail from "./PurchaseDetail";
import UpdatePaymentModal from "@/components/payment/UpdatePaymentModal";

export default function Purchases() {
  const [detailId, setDetailId] = useState(null);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [version, setVersion] = useState(0);

  return (
    <>
      <CrudPage
        config={purchasesConfig}
        CustomForm={PurchaseForm}
        reloadKey={version}
        rowActions={(row) => (
          <>
            <button
              className="rounded p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
              onClick={() => setPaymentTarget(row)}
              aria-label="Update Status Pembayaran"
              title="Update Status Pembayaran / Pelunasan"
            >
              <CreditCard size={16} />
            </button>
            <button
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
              onClick={() => setDetailId(row.id)}
              aria-label="Detail"
              title="Lihat Detail Pembelian"
            >
              <Eye size={16} />
            </button>
          </>
        )}
      />
      {detailId && (
        <PurchaseDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
      {paymentTarget && (
        <UpdatePaymentModal
          type="purchase"
          data={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSuccess={() => setVersion((v) => v + 1)}
        />
      )}
    </>
  );
}
