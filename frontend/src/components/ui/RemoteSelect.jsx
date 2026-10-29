import { useOptions } from "@/hooks/useOptions";

export default function RemoteSelect({ endpoint, getLabel = (r) => r.name, value, onChange, placeholder = "Pilih...", className = "input" }) {
  const { rows, loading } = useOptions(endpoint);
  return (
    <select className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={loading}>
      <option value="">{loading ? "Memuat..." : placeholder}</option>
      {rows.map((r) => <option key={r.id} value={r.id}>{getLabel(r)}</option>)}
    </select>
  );
}
