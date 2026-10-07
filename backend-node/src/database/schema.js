const db = require('./db');

// SQL Schema untuk semua tabel
const createTablesSQL = `
-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operator') DEFAULT 'operator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabel Categories
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabel Units (Satuan)
CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabel Products (Data Barang)
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category_id INT,
  unit_id INT,
  quantity INT DEFAULT 0,
  stock INT DEFAULT 0,
  demand INT DEFAULT 0,
  current_price DECIMAL(15,2) DEFAULT 0,
  previous_price DECIMAL(15,2) DEFAULT 0,
  minimum_stock INT DEFAULT 5,
  location VARCHAR(100),
  description TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabel Stock In (Barang Masuk)
CREATE TABLE IF NOT EXISTS stock_in (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(100) NOT NULL UNIQUE,
  transaction_date DATE NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  supplier VARCHAR(255),
  description TEXT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transaction (transaction_number),
  INDEX idx_date (transaction_date),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabel Stock Out (Barang Keluar)
CREATE TABLE IF NOT EXISTS stock_out (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_number VARCHAR(100) NOT NULL UNIQUE,
  transaction_date DATE NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  recipient VARCHAR(255),
  description TEXT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transaction (transaction_number),
  INDEX idx_date (transaction_date),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabel Price History (Riwayat Harga)
CREATE TABLE IF NOT EXISTS price_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  old_price DECIMAL(15,2) NOT NULL,
  new_price DECIMAL(15,2) NOT NULL,
  difference DECIMAL(15,2) NOT NULL,
  percentage DECIMAL(10,4) NOT NULL,
  description TEXT,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product (product_id),
  INDEX idx_date (created_at),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabel Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id INT,
  data_before TEXT,
  data_after TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_date (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabel Settings
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabel Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'danger', 'success') DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read),
  INDEX idx_date (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Data Awal (Seed Data)
INSERT INTO categories (name, description) VALUES
('Alat Tulis', 'Peralatan menulis'),
('Kertas', 'Berbagai jenis kertas'),
('Alat Kantor', 'Peralatan kantor umum'),
('Lainnya', 'Barang lainnya');

INSERT INTO units (name, code, description) VALUES
('Buah', 'PCS', 'Pieces/Unit'),
('Bungkus', 'PKG', 'Package'),
('Lembar', 'SHEET', 'Sheet'),
('Kotak', 'BOX', 'Box'),
('Dus', 'DUS', 'Dozen/Box'),
('Pack', 'PACK', 'Pack');

INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@atk.local', '\$2a\$10\$你的hashpassworddisini', 'admin');

INSERT INTO settings (key_name, value, description) VALUES
('company_name', 'PT / Instansi / Kantor', 'Nama instansi/perusahaan'),
('company_address', 'Jl. Contoh No. 123, Jakarta', 'Alamat instansi'),
('company_phone', '(021) 1234-5678', 'Nomor telepon'),
('contact_person', 'Admin Gudang', 'Penanggung jawab/gudang'),
('default_min_stock', '5', 'Batas stok minimum default'),
('default_unit', 'PCS', 'Satuan default'),
('transaction_format_in', 'BM-YYYYMMDD-###', 'Format nomor transaksi barang masuk'),
('transaction_format_out', 'BK-YYYYMMDD-###', 'Format nomor transaksi barang keluar');

-- Data products awal (contoh)
INSERT INTO products (code, name, category_id, unit_id, quantity, stock, demand, current_price, previous_price, minimum_stock, location, description) VALUES
('ATK-001', 'Pulpen Hitam', 1, 1, 100, 100, 0, 32000.00, 0.00, 5, 'Lemari A1', 'Pulpen hitam bolpoint'),
('ATK-002', 'Kertas A4 80gsm', 2, 6, 500, 500, 0, 55000.00, 0.00, 10, 'Rak 1', 'Kertas A4 ukuran 21x29cm 80gsm'),
('ATK-003', 'Pensil 2B', 1, 1, 80, 80, 0, 35000.00, 0.00, 5, 'Lemari A2', 'Pensil kayu 2B'),
('ATK-004', 'Map Plastik', 1, 4, 200, 200, 0, 15000.00, 0.00, 10, 'Rak 2', 'Map plastik transparan'),
('ATK-005', 'Stapler', 3, 1, 30, 30, 0, 75000.00, 0.00, 3, 'Lemari B1', 'Stapler ukuran kecil'),
('ATK-006', 'Isi Staples', 3, 4, 100, 100, 0, 12000.00, 0.00, 5, 'Lemari B2', 'Isi staples ukuran kecil'),
('ATK-007', 'Spidol Whiteboard', 1, 5, 60, 60, 0, 25000.00, 0.00, 5, 'Lemari C1', 'Spidol whiteboard warna hitam'),
('ATK-008', 'Buku Tulis', 1, 4, 150, 150, 0, 28000.00, 0.00, 10, 'Rak 3', 'Buku tulis A4 100 hlm'),
('ATK-009', 'Amplop', 1, 6, 300, 300, 0, 18000.00, 0.00, 15, 'Rak 4', 'Amplop coklat ukuran 10x16cm'),
('ATK-010', 'Folder', 3, 4, 100, 100, 0, 35000.00, 0.00, 5, 'Lemari D1', 'Folder kertas plastik');
`;

module.exports = createTablesSQL;
