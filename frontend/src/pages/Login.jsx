import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Package } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) return toast.error("Username dan password wajib diisi");
    setLoading(true);
    try { await login(form); } catch { /* toast dari request */ } finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white"><Package /></div>
          <h1 className="text-xl font-semibold">Toko Sukses</h1>
          <p className="text-sm text-slate-500">Manajemen stok & pembelian</p>
        </div>
        <input className="input" placeholder="Username" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input className="input" type="password" placeholder="Password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={loading}>{loading && <Loader2 size={16} className="animate-spin" />}Masuk</button>
      </form>
    </div>
  );
}
