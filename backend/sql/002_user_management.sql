-- ========================================================
-- Migration: 002_user_management.sql
-- Tujuan: Menambahkan kolom updated_at dan index pada tabel users
-- Tanggal: 2026-10-29
-- ========================================================

USE toko_sukses;

-- 1. Tambah kolom updated_at jika belum ada
-- (Menggunakan store procedure sederhana agar aman dijalankan berulang kali / idempotent)
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS add_updated_at_to_users()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
  END IF;
END$$
DELIMITER ;

CALL add_updated_at_to_users();
DROP PROCEDURE IF EXISTS add_updated_at_to_users;

-- 2. Tambah index pencarian role dan is_active jika belum ada
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS add_indexes_to_users()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND INDEX_NAME = 'idx_users_role'
  ) THEN
    ALTER TABLE users ADD INDEX idx_users_role (role);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND INDEX_NAME = 'idx_users_active'
  ) THEN
    ALTER TABLE users ADD INDEX idx_users_active (is_active);
  END IF;
END$$
DELIMITER ;

CALL add_indexes_to_users();
DROP PROCEDURE IF EXISTS add_indexes_to_users;

-- ========================================================
-- Catatan:
-- Akun pengguna baru (Admin maupun Staf) kini dapat ditambahkan,
-- diedit, diubah role, diubah status aktif/nonaktif, dan diubah
-- password-nya secara dinamis melalui UI "Data Akun & Pengguna".
-- ========================================================

