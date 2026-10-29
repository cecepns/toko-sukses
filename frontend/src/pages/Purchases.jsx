import { useState } from "react";
import { Eye } from "lucide-react";
import CrudPage from "@/components/crud/CrudPage";
import { purchasesConfig } from "@/config/pages";
import PurchaseForm from "./PurchaseForm";
import PurchaseDetail from "./PurchaseDetail";

export default function Purchases() {
  const [detailId, setDetailId] = useState(null);
  const [version, setVersion] = useState(0);
  return (
    <>
      <CrudPage
        config={purchasesConfig} CustomForm={PurchaseForm} reloadKey={version}
        rowActions={(row) => <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600" onClick={() => setDetailId(row.id)} aria-label="Detail"><Eye size={16} /></button>}
      />
      {detailId && <PurchaseDetail id={detailId} onClose={() => setDetailId(null)} onChanged={() => setVersion((v) => v + 1)} />}
    </>
  );
}
