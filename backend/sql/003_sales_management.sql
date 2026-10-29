-- ========================================================
-- Migration: 003_sales_management.sql
-- Tujuan: Menambahkan modul Penjualan Barang (tabel sales, sale_items, serta tipe 'sale' pada kartu stok)
-- Tanggal: 2026-10-29
-- ========================================================

USE toko_sukses;

-- 1. Buat tabel sales (header transaksi penjualan) jika belum ada
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(40) NOT NULL UNIQUE,
  customer_id INT NULL,
  sale_date DATE NOT NULL,
  invoice_no VARCHAR(60) NULL,
  note TEXT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  extra_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_status ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'paid',
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  cancel_reason VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sales_date (sale_date),
  INDEX idx_sales_status (status),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Buat tabel sale_items (detail item barang terjual) jika belum ada
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  INDEX idx_sale_product (product_id),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 3. Tambahkan tipe 'sale' pada kolom type di tabel stock_movements
ALTER TABLE stock_movements 
MODIFY COLUMN type ENUM('opening','purchase','sale','in','out','adjust','cancel') NOT NULL;

