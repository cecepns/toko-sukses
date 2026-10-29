-- ========================================================
-- Migration: 004_fix_foreign_keys_and_payments.sql
-- Tujuan: Menambahkan dukungan update status pembayaran (DP/Lunas)
--         dan optimasi relasi agar barang & transaksi dapat dihapus/diedit aman
-- Tanggal: 2026-10-29
-- ========================================================

USE toko_sukses;

-- 1. Pastikan kolom payment_status mendukung 'unpaid', 'partial', 'paid'
ALTER TABLE purchases 
MODIFY COLUMN payment_status ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid';

ALTER TABLE sales 
MODIFY COLUMN payment_status ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'paid';

-- 2. Tambah index pada payment_status agar pencarian/filter hutang-piutang cepat
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS add_payment_indexes()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'purchases' 
      AND INDEX_NAME = 'idx_purchases_payment'
  ) THEN
    ALTER TABLE purchases ADD INDEX idx_purchases_payment (payment_status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'sales' 
      AND INDEX_NAME = 'idx_sales_payment'
  ) THEN
    ALTER TABLE sales ADD INDEX idx_sales_payment (payment_status);
  END IF;
END$$
DELIMITER ;

CALL add_payment_indexes();
DROP PROCEDURE IF EXISTS add_payment_indexes;

-- ========================================================
-- Catatan Perubahan Logika Sistem:
-- 1. Data Barang kini dapat dihapus oleh Admin (riwayat transaksi
--    dan pergerakan stok terkait dibersihkan secara aman dalam 1 transaksi DB).
-- 2. Transaksi Barang Masuk, Barang Keluar, dan Penyesuaian Stok
--    kini memiliki fitur Edit Keterangan dan Hapus (otomatis membalikkan stok).
-- 3. Transaksi Pembelian & Penjualan kini memiliki fitur Hapus
--    dan fitur Pelunasan / Update Status Pembayaran (dari DP ke Lunas).
-- ========================================================

