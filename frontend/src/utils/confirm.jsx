import toast from "react-hot-toast";

/** Dialog konfirmasi berbasis toast. Resolve true/false. */
export function confirmToast(message, confirmText = "Ya, lanjutkan") {
  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div className="w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-sm text-slate-700">{message}</p>
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-ghost !py-1.5" onClick={() => { toast.dismiss(t.id); resolve(false); }}>Batal</button>
            <button className="btn-danger !py-1.5" onClick={() => { toast.dismiss(t.id); resolve(true); }}>{confirmText}</button>
          </div>
        </div>
      ),
      { duration: Infinity, position: "top-center" }
    );
  });
}
