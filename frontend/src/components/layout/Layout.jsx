import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { KeyRound, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NAV } from "@/config/nav";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";

const isDesktop = () => window.innerWidth >= 1024;

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(isDesktop());
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { if (!isDesktop()) setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
          <span className="text-lg font-bold text-indigo-600">Toko Sukses</span>
          <button className="rounded p-1 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu"><X size={18} /></button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {NAV.map((group) => {
            const items = group.items.filter((item) => !item.adminOnly || isAdmin);
            if (!items.length) return null;
            return (
              <div key={group.label || "main"}>
                {group.label && <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>}
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${isActive ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
                    <Icon size={18} />{label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className={`transition-[padding] duration-300 ease-in-out ${open ? "lg:pl-64" : "lg:pl-0"}`}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen((o) => !o)} aria-label="Toggle sidebar"><Menu size={20} /></button>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs capitalize text-slate-500">{user?.role}</p>
            </div>
            <button
              className="btn-ghost !px-2.5 text-slate-500 hover:text-indigo-600"
              onClick={() => setChangePwdOpen(true)}
              title="Ubah Password"
              aria-label="Ubah Password"
            >
              <KeyRound size={16} />
            </button>
            <button className="btn-ghost !px-2.5" onClick={logout} aria-label="Keluar" title="Keluar"><LogOut size={16} /></button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
      </div>

      {changePwdOpen && <ChangePasswordModal onClose={() => setChangePwdOpen(false)} />}
    </div>
  );
}
