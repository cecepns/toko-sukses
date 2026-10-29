# CV Cah Bejo — Manajemen Stok, Pembelian, Penjualan & Inventaris

Stack: React + Vite + JSX + PWA + TailwindCSS + Lucide + react-hot-toast | Express + MySQL (REST API).

## Menjalankan
1. **Database**: import `backend/sql/database.sql` ke MySQL.
2. **Backend**
   ```bash
   cd backend && cp .env.example .env   # isi DB_* dan JWT_SECRET
   npm install && npm run dev
   ```
   Akun admin awal otomatis dibuat dari `ADMIN_USERNAME` / `ADMIN_PASSWORD` (default `admin` / `admin123`, **ganti sebelum production**).
3. **Frontend**
   ```bash
   cd frontend && cp .env.example .env
   npm install && npm run dev      # build: npm run build
   ```

## Catatan teknis
- Stok & kuantitas `DECIMAL(12,3)`; input menerima `12,5` / `12.5`, tampil format Indonesia.
- Semua perubahan stok lewat satu fungsi `moveStock` (dalam transaksi DB) + riwayat di `stock_movements` (kartu stok).
- Pembelian otomatis menambah stok & menghitung harga modal rata-rata tertimbang. Pembatalan membalik stok (admin saja).
- Endpoint frontend terpusat di `frontend/src/utils/endpoints.js`.
# toko-sukses
