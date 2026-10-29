import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import RemoteSelect from "@/components/ui/RemoteSelect";

export default function ListToolbar({ list, filters = [] }) {
  const [text, setText] = useState("");
  const debounced = useDebounce(text, 400);
  useEffect(() => { if (debounced !== list.query.search) list.setSearch(debounced); /* eslint-disable-next-line */ }, [debounced]);

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-56 sm:max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input !pl-9" placeholder="Cari..." value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {filters.map((f) => {
        const value = list.query[f.name] ?? "";
        const onChange = (v) => list.setFilter(f.name, v);
        if (f.type === "remote") return <RemoteSelect key={f.name} className="input sm:!w-auto" endpoint={f.endpoint} getLabel={f.getLabel} placeholder={f.placeholder} value={value} onChange={onChange} />;
        if (f.type === "date") return (
          <label key={f.name} className="flex items-center gap-2 text-sm text-slate-500">{f.label}
            <input type="date" className="input sm:!w-auto" value={value} onChange={(e) => onChange(e.target.value)} />
          </label>
        );
        return (
          <select key={f.name} className="input sm:!w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{f.placeholder}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
      })}
    </div>
  );
}
