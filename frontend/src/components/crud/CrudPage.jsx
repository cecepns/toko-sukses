import { useState } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useList } from "@/hooks/useList";
import { useAuth } from "@/context/AuthContext";
import { del, fetchAll, post, put } from "@/utils/request";
import { confirmToast } from "@/utils/confirm";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import FormModal from "./FormModal";
import ListToolbar from "./ListToolbar";

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Halaman list + modal create/edit + delete confirm, digerakkan oleh config. */
export default function CrudPage({ config, listParams, fixedValues, CustomForm, rowActions, reloadKey }) {
  const { title, subtitle, endpoint, columns, fields = [], filters = [], canCreate = true, canEdit = true, canDelete = true, createLabel = "Tambah", exportName } = config;
  const { isAdmin } = useAuth();
  const list = useList(endpoint.LIST, { fixed: listParams, reloadKey });
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const save = async (values) => {
    setSaving(true);
    try {
      if (modal.row) await put(endpoint.DETAIL(modal.row.id), values, { success: "Data diperbarui" });
      else await post(endpoint.LIST, values, { success: "Data tersimpan" });
      setModal(null);
      list.reload();
    } catch { /* toast sudah ditampilkan */ } finally { setSaving(false); }
  };

  const remove = async (row) => {
    const itemLabel = row.name || row.number || (row.product_name ? `${row.product_name} (${row.type})` : null) || "data ini";
    if (!(await confirmToast(`Hapus "${itemLabel}"?`, "Ya, hapus"))) return;
    try { await del(endpoint.DETAIL(row.id), { success: "Data dihapus" }); list.reload(); } catch { /* noop */ }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { page, limit, ...rest } = list.query;
      const rows = await fetchAll(endpoint.LIST, { ...rest, ...listParams });
      const cols = columns.filter((c) => c.label);
      const csv = [cols.map((c) => csvCell(c.label)).join(","), ...rows.map((r) => cols.map((c) => csvCell(c.csv ? c.csv(r) : r[c.key])).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
      Object.assign(document.createElement("a"), { href: url, download: `${exportName}.csv` }).click();
      URL.revokeObjectURL(url);
      toast.success(`${rows.length} baris diexport`);
    } catch { /* noop */ } finally { setExporting(false); }
  };

  const hasActions = canEdit || canDelete || rowActions;
  const actions = hasActions && ((row) => (
    <>
      {rowActions?.(row)}
      {canEdit && <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600" onClick={() => setModal({ row })} aria-label="Edit"><Pencil size={16} /></button>}
      {canDelete && isAdmin && <button className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => remove(row)} aria-label="Hapus"><Trash2 size={16} /></button>}
    </>
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          {exportName && <button className="btn-ghost" onClick={exportCsv} disabled={exporting}><Download size={16} />Export CSV</button>}
          {canCreate && <button className="btn-primary" onClick={() => setModal({ row: null })}><Plus size={16} />{createLabel}</button>}
        </div>
      </div>

      <div className="card overflow-hidden">
        <ListToolbar list={list} filters={filters} />
        <DataTable columns={columns} rows={list.rows} loading={list.loading} error={list.error} onRetry={list.reload} sort={list.query} onSort={list.setSort} actions={actions} />
        <Pagination pagination={list.pagination} onPage={list.setPage} onLimit={list.setLimit} />
      </div>

      {modal && (CustomForm
        ? <CustomForm onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />
        : <FormModal title={`${modal.row ? "Edit" : createLabel} ${title}`} fields={fields} initial={modal.row} fixedValues={fixedValues} saving={saving} onSubmit={save} onClose={() => setModal(null)} />)}
    </div>
  );
}
