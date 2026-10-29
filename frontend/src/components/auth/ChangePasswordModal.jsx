import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { put } from "@/utils/request";

export default function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.current_password) return toast.error("Password saat ini wajib diisi");
    if (!form.new_password) return toast.error("Password baru wajib diisi");
    if (form.new_password.length < 6) return toast.error("Password baru minimal 6 karakter");
    if (form.new_password !== form.confirm_password) return toast.error("Konfirmasi password baru tidak cocok");

    setSaving(true);
    try {
      await put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        current_password: form.current_password,
        new_password: form.new_password,
      }, { success: "Password berhasil diperbarui" });
      onClose();
    } catch {
      /* toast error otomatis ditangani oleh request */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Ubah Password" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Password Saat Ini <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            className="input"
            placeholder="Masukkan password saat ini"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Password Baru <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            className="input"
            placeholder="Minimal 6 karakter"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Konfirmasi Password Baru <span className="text-rose-500">*</span>
          </label>
          <input
            type="password"
            className="input"
            placeholder="Ulangi password baru"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Simpan Password
          </button>
        </div>
      </form>
    </Modal>
  );
}

