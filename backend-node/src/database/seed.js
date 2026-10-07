const db = require('./db');
const bcrypt = require('bcryptjs');

// Default admin password
const DEFAULT_ADMIN_PASSWORD = 'admin123';

async function seed() {
  console.log('Menjalankan seeding data awal...');

  try {
    // Hash default password
    const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);

    // Check if admin already exists
    const [existingAdmin] = await db.execute(`SELECT * FROM users WHERE email = 'admin@atk.local'`);
    
    if (existingAdmin.length === 0) {
      // Create default admin user
      await db.execute(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        ['Admin', 'admin@atk.local', hashedPassword, 'admin']
      );
      console.log('✓ User admin berhasil dibuat (email: admin@atk.local, password: admin123)');
    } else {
      // Update password
      await db.execute(
        `UPDATE users SET password = ? WHERE email = 'admin@atk.local'`,
        [hashedPassword]
      );
      console.log('✓ Password admin berhasil diupdate (password: admin123)');
    }

    // Check if categories exist
    const [existingCategories] = await db.execute(`SELECT * FROM categories LIMIT 1`);
    if (existingCategories.length === 0) {
      await db.execute(
        `INSERT INTO categories (name, description) VALUES 
         ('Alat Tulis', 'Peralatan menulis'),
         ('Kertas', 'Berbagai jenis kertas'),
         ('Alat Kantor', 'Peralatan kantor umum'),
         ('Lainnya', 'Barang lainnya')`
      );
      console.log('✓ Kategori awal berhasil dibuat');
    } else {
      console.log('✓ Kategori sudah ada');
    }

    // Check if units exist
    const [existingUnits] = await db.execute(`SELECT * FROM units LIMIT 1`);
    if (existingUnits.length === 0) {
      await db.execute(
        `INSERT INTO units (name, code, description) VALUES 
         ('Buah', 'PCS', 'Pieces/Unit'),
         ('Bungkus', 'PKG', 'Package'),
         ('Lembar', 'SHEET', 'Sheet'),
         ('Kotak', 'BOX', 'Box'),
         ('Dus', 'DUS', 'Dozen/Box'),
         ('Pack', 'PACK', 'Pack')`
      );
      console.log('✓ Satuan awal berhasil dibuat');
    } else {
      console.log('✓ Satuan sudah ada');
    }

    // Check if products exist
    const [existingProducts] = await db.execute(`SELECT * FROM products LIMIT 1`);
    if (existingProducts.length === 0) {
      await db.execute(
        `INSERT INTO products (code, name, category_id, unit_id, quantity, stock, demand, current_price, minimum_stock, location, description) VALUES 
         ('ATK-001', 'Pulpen Hitam', 1, 1, 100, 100, 0, 32000.00, 5, 'Lemari A1', 'Pulpen hitam bolpoint'),
         ('ATK-002', 'Kertas A4 80gsm', 2, 6, 500, 500, 0, 55000.00, 10, 'Rak 1', 'Kertas A4 ukuran 21x29cm 80gsm'),
         ('ATK-003', 'Pensil 2B', 1, 1, 80, 80, 0, 35000.00, 5, 'Lemari A2', 'Pensil kayu 2B'),
         ('ATK-004', 'Map Plastik', 1, 4, 200, 200, 0, 15000.00, 10, 'Rak 2', 'Map plastik transparan'),
         ('ATK-005', 'Stapler', 3, 1, 30, 30, 0, 75000.00, 3, 'Lemari B1', 'Stapler ukuran kecil'),
         ('ATK-006', 'Isi Staples', 3, 4, 100, 100, 0, 12000.00, 5, 'Lemari B2', 'Isi staples ukuran kecil'),
         ('ATK-007', 'Spidol Whiteboard', 1, 5, 60, 60, 0, 25000.00, 5, 'Lemari C1', 'Spidol whiteboard warna hitam'),
         ('ATK-008', 'Buku Tulis', 1, 4, 150, 150, 0, 28000.00, 10, 'Rak 3', 'Buku tulis A4 100 hlm'),
         ('ATK-009', 'Amplop', 1, 6, 300, 300, 0, 18000.00, 15, 'Rak 4', 'Amplop coklat ukuran 10x16cm'),
         ('ATK-010', 'Folder', 3, 4, 100, 100, 0, 35000.00, 5, 'Lemari D1', 'Folder kertas plastik')`
      );
      console.log('✓ Data produk awal berhasil dibuat');
    } else {
      console.log('✓ Produk sudah ada');
    }

    // Check if settings exist
    const [existingSettings] = await db.execute(`SELECT * FROM settings LIMIT 1`);
    if (existingSettings.length === 0) {
      await db.execute(
        `INSERT INTO settings (key_name, value, description) VALUES 
         ('company_name', 'PT / Instansi / Kantor', 'Nama instansi/perusahaan'),
         ('company_address', 'Jl. Contoh No. 123, Jakarta', 'Alamat instansi'),
         ('company_phone', '(021) 1234-5678', 'Nomor telepon'),
         ('contact_person', 'Admin Gudang', 'Penanggung jawab/gudang'),
         ('default_min_stock', '5', 'Batas stok minimum default'),
         ('default_unit', 'PCS', 'Satuan default'),
         ('transaction_format_in', 'BM-YYYYMMDD-###', 'Format nomor transaksi barang masuk'),
         ('transaction_format_out', 'BK-YYYYMMDD-###', 'Format nomor transaksi barang keluar')`
      );
      console.log('✓ Pengaturan awal berhasil dibuat');
    } else {
      console.log('✓ Pengaturan sudah ada');
    }

    console.log('');
    console.log('=== SEEDING BERHASIL ===');
    console.log('Email admin: admin@atk.local');
    console.log('Password: admin123');
    console.log('');

  } catch (err) {
    console.error('✗ Error saat menjalankan seeding:', err);
    process.exit(1);
  }
}

seed();
