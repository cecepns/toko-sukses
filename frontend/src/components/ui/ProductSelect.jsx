import RemoteSelect from "./RemoteSelect";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { formatQty } from "@/utils/format";

export default function ProductSelect({
  value,
  onChange,
  placeholder = "Cari nama barang / kode...",
  className = "",
  checkStock = false,
  isDisabled = false,
}) {
  return (
    <RemoteSelect
      endpoint={API_ENDPOINTS.PRODUCTS.LIST}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      isDisabled={isDisabled}
      getLabel={(p) => `${p.name} (${p.unit_symbol || "-"})`}
      formatOptionLabel={(opt) => {
        const p = opt.raw;
        const stockNum = Number(p?.stock ?? 0);
        const isOutOfStock = checkStock && stockNum <= 0;
        return (
          <div className="flex items-center justify-between gap-2 py-0.5">
            <div className="flex flex-col">
              <span className={`font-medium ${isOutOfStock ? "text-slate-400 line-through" : ""}`}>
                {p?.name || opt.label}
              </span>
              {p?.code && <span className="text-xs text-slate-400">{p.code}</span>}
            </div>
            {p?.stock !== undefined && (
              <span
                className={`text-xs whitespace-nowrap rounded px-1.5 py-0.5 ${
                  isOutOfStock
                    ? "bg-rose-100 text-rose-600 font-semibold"
                    : stockNum <= (p.min_stock || 0)
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Stok: {formatQty(stockNum)} {p?.unit_symbol || ""}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}

