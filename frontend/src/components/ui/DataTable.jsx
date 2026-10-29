import { AlertCircle, ArrowDown, ArrowUp, PackageOpen } from "lucide-react";

export default function DataTable({ columns, rows, loading, error, onRetry, sort, onSort, actions }) {
  const colSpan = columns.length + (actions ? 1 : 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 font-medium ${c.align === "right" ? "text-right" : ""} ${c.sortKey ? "cursor-pointer select-none" : ""}`} onClick={() => c.sortKey && onSort(c.sortKey)}>
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {c.sortKey && sort.sortBy === c.sortKey && (sort.order === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                </span>
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-right font-medium">Aksi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>{Array.from({ length: colSpan }).map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-200" /></td>)}</tr>
          ))}
          {!loading && error && (
            <tr><td colSpan={colSpan} className="px-4 py-12 text-center">
              <AlertCircle className="mx-auto mb-2 text-rose-500" />
              <p className="text-slate-600">{error}</p>
              <button className="btn-ghost mt-3" onClick={onRetry}>Coba lagi</button>
            </td></tr>
          )}
          {!loading && !error && rows.length === 0 && (
            <tr><td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">
              <PackageOpen className="mx-auto mb-2 text-slate-400" /> Belum ada data
            </td></tr>
          )}
          {!loading && !error && rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}>{c.render ? c.render(row) : row[c.key] ?? "-"}</td>
              ))}
              {actions && <td className="px-4 py-3"><div className="flex justify-end gap-1">{actions(row)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
