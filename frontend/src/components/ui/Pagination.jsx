import { ChevronLeft, ChevronRight } from "lucide-react";

const LIMITS = [10, 25, 50, 100];

function pageList(page, total) {
  const pages = [...new Set([1, total, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, i) => { if (i && p - pages[i - 1] > 1) out.push(`gap-${p}`); out.push(p); });
  return out;
}

export default function Pagination({ pagination, onPage, onLimit }) {
  const { page, limit, total, totalPages } = pagination;
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row">
      <div className="flex items-center gap-2 text-slate-500">
        <span>Tampil</span>
        <select className="input !w-auto !py-1" value={limit} onChange={(e) => onLimit(Number(e.target.value))}>
          {LIMITS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span>{from}-{to} dari {total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-ghost !px-2 !py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Sebelumnya"><ChevronLeft size={16} /></button>
        {pageList(page, totalPages).map((p) =>
          typeof p === "string" ? <span key={p} className="px-1 text-slate-400">…</span> : (
            <button key={p} onClick={() => onPage(p)} className={`h-8 min-w-8 rounded-lg px-2 text-sm ${p === page ? "bg-indigo-600 font-medium text-white" : "hover:bg-slate-100"}`}>{p}</button>
          )
        )}
        <button className="btn-ghost !px-2 !py-1.5" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Berikutnya"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
