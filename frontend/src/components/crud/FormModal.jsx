import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import RemoteSelect from "@/components/ui/RemoteSelect";
import { parseDecimal } from "@/utils/format";

function Field({ field, value, error, onChange }) {
  const common = { className: `input ${error ? "!border-rose-400" : ""}`, value: value ?? "", placeholder: field.placeholder };
  let control;
  if (field.type === "select" && field.endpoint)
    control = <RemoteSelect endpoint={field.endpoint} getLabel={field.getLabel} value={value} onChange={onChange} placeholder={`Pilih ${field.label.toLowerCase()}`} className={common.className} />;
  else if (field.options)
    control = (
      <select {...common} onChange={(e) => onChange(e.target.value)}>
        {field.placeholder && <option value="">{field.placeholder}</option>}
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  else if (field.type === "textarea") control = <textarea rows={3} {...common} onChange={(e) => onChange(e.target.value)} />;
  else if (field.type === "decimal") control = <input {...common} inputMode="decimal" onChange={(e) => onChange(e.target.value)} />;
  else control = <input {...common} type={field.type || "text"} onChange={(e) => onChange(e.target.value)} />;
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {field.label}
        {field.required && !field.optionalOnEdit && <span className="text-rose-500"> *</span>}
        {field.optionalOnEdit && <span className="text-xs font-normal text-slate-400"> (opsional saat edit)</span>}
      </label>
      {control}
      {field.hint && !error && <p className="mt-1 text-xs text-slate-500">{field.hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export default function FormModal({ title, fields, initial, fixedValues, saving, onSubmit, onClose }) {
  const visible = fields.filter((f) => !(initial && f.createOnly));
  const [values, setValues] = useState(() => Object.fromEntries(visible.map((f) => [f.name, initial?.[f.name] ?? f.default ?? ""])));
  const [errors, setErrors] = useState({});
  const set = (name, v) => { setValues((s) => ({ ...s, [name]: v })); setErrors((e) => ({ ...e, [name]: undefined })); };

  const submit = (e) => {
    e.preventDefault();
    const errs = {}, out = { ...fixedValues };
    for (const f of visible) {
      const raw = values[f.name];
      const isBlank = String(raw ?? "").trim() === "";
      if (isBlank) {
        if (f.required && !(initial && f.optionalOnEdit)) {
          errs[f.name] = `${f.label} wajib diisi`;
        }
        if (!(initial && f.optionalOnEdit)) {
          out[f.name] = "";
        }
      } else if (f.type === "decimal") {
        const n = parseDecimal(raw);
        if (n === null) errs[f.name] = "Masukkan angka yang valid (contoh 12,5)";
        else if (!f.allowNegative && n < 0) errs[f.name] = "Tidak boleh negatif";
        else out[f.name] = n;
      } else {
        if (f.minLength && String(raw).length < f.minLength) {
          errs[f.name] = `${f.label} minimal ${f.minLength} karakter`;
        } else if (f.pattern && !f.pattern.test(raw)) {
          errs[f.name] = f.patternError || `${f.label} format tidak valid`;
        }
        out[f.name] = raw;
      }
    }
    if (Object.keys(errs).length) return setErrors(errs);
    onSubmit(out);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {visible.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={(v) => set(f.name, v)} />)}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Batal</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving && <Loader2 size={16} className="animate-spin" />}Simpan</button>
        </div>
      </form>
    </Modal>
  );
}
