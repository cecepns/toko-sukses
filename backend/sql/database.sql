CREATE DATABASE IF NOT EXISTS toko_sukses CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE toko_sukses;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  symbol VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  contact_name VARCHAR(100) NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  company VARCHAR(150) NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category_id INT NULL,
  unit_id INT NOT NULL,
  stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  supplier_id INT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_stock CHECK (stock >= 0),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(40) NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  purchase_date DATE NOT NULL,
  invoice_no VARCHAR(60) NULL,
  note TEXT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) NOT NULL DEFAULT 0,
  extra_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  payment_status ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
  status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
  cancel_reason VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  type ENUM('opening','purchase','in','out','adjust','cancel') NOT NULL,
  quantity DECIMAL(12,3) NOT NULL COMMENT 'bertanda: + masuk, - keluar',
  balance_after DECIMAL(12,3) NOT NULL,
  unit_price DECIMAL(15,2) NULL,
  ref_type VARCHAR(30) NULL,
  ref_id INT NULL,
  note VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_created (created_at),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== Sample data (akun admin dibuat otomatis oleh server.js saat pertama jalan) =====
INSERT INTO units (id,name,symbol) VALUES (1,'Kilogram','kg'),(2,'Gram','g'),(3,'Meter','m'),(4,'Pcs','pcs'),(5,'Roll','roll'),(6,'Liter','l');
INSERT INTO categories (id,name,description) VALUES (1,'Kain','Berbagai jenis kain'),(2,'Sembako',NULL),(3,'Perlengkapan',NULL);
INSERT INTO suppliers (id,code,name,contact_name,phone,address,company) VALUES
 (1,'SUP-00001','Toko Kain Makmur','Pak Budi','081234567890','Pasar Tanah Abang, Jakarta','CV Makmur Textile'),
 (2,'SUP-00002','Sumber Rejeki','Bu Sari','081298765432','Bandung',NULL);
INSERT INTO products (id,code,name,category_id,unit_id,stock,cost_price,sell_price,min_stock,supplier_id) VALUES
 (1,'BRG-00001','Kain Katun',1,1,12.750,50000,65000,5,1),
 (2,'BRG-00002','Kain Linen',1,1,3.500,80000,100000,5,1),
 (3,'BRG-00003','Benang Jahit',3,5,40,8000,12000,10,2);
INSERT INTO stock_movements (product_id,type,quantity,balance_after,unit_price,note) VALUES
 (1,'opening',12.750,12.750,50000,'Stok awal'),
 (2,'opening',3.500,3.500,80000,'Stok awal'),
 (3,'opening',40,40,8000,'Stok awal');
