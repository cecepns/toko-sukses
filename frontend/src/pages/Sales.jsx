import { useState } from "react";
import { Eye } from "lucide-react";
import CrudPage from "@/components/crud/CrudPage";
import { salesConfig } from "@/config/pages";
import SaleForm from "./SaleForm";
import SaleDetail from "./SaleDetail";

export default function Sales() {
  const [detailId, setDetailId] = useState(null);
  const [version, setVersion] = useState(0);

  return (
    <>
      <CrudPage
        config={salesConfig}
        CustomForm={SaleForm}
        reloadKey={version}
        rowActions={(row) => (
          <button
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
            onClick={() => setDetailId(row.id)}
            aria-label="Detail Penjualan"
            title="Lihat Detail"
          >
            <Eye size={16} />
          </button>
        )}
      />
      {detailId && (
        <SaleDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => setVersion((v) => v + 1)}
        />
      )}
    </>
  );
}

