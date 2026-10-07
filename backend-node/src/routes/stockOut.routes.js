const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../database/db');
const {
  createStockOut,
  getAllStockOut,
  getStockOutById,
  updateStockOut,
  deleteStockOut,
  generateTransactionNumber
} = require('../controllers/stockOut.controller');
const {
  getStockInByDate,
  getStockOutByDate
} = require('../controllers/stockIn.controller');

// Generate transaction number
router.get('/transaction-number', verifyToken, async (req, res) => {
  try {
    const date = new Date();
    const stockInCount = await getStockInByDate(date.toISOString().split('T')[0]);
    const stockOutCount = await getStockOutByDate(date.toISOString().split('T')[0]);
    
    const count = Math.max(stockInCount, stockOutCount) + 1;
    const transactionNumber = generateTransactionNumber('BK', date) + String(count).padStart(3, '0');
    
    res.json({
      success: true,
      data: { transactionNumber }
    });
  } catch (err) {
    console.error('Generate transaction number error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal generate nomor transaksi'
    });
  }
});

// Get all stock out
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, product_id, start_date, end_date, page = 1, limit = 10 } = req.query;
    const stockOuts = await getAllStockOut(search, product_id, start_date, end_date, page, limit);
    
    res.json({
      success: true,
      data: stockOuts
    });
  } catch (err) {
    console.error('Get stock out error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data barang keluar'
    });
  }
});

// Get stock out by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const stockOut = await getStockOutById(req.params.id);
    
    if (!stockOut) {
      return res.status(404).json({
        success: false,
        message: 'Barang keluar tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      data: stockOut
    });
  } catch (err) {
    console.error('Get stock out error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data barang keluar'
    });
  }
});

// Create stock out
router.post('/', verifyToken, async (req, res) => {
  try {
    const { transaction_date, product_id, quantity, recipient, description } = req.body;
    
    if (!transaction_date || !product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal, produk, dan jumlah harus diisi'
      });
    }

    // Get product and check stock
    const [product] = await db.execute(`SELECT * FROM products WHERE id = ?`, [product_id]);
    
    if (!product.length) {
      return res.status(400).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }

    if (product[0].stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Stok tidak mencukupi'
      });
    }

    const result = await generateTransaction(req);

    const stockOutId = await createStockOut({
      transaction_number: result.transactionNumber,
      transaction_date,
      product_id,
      quantity,
      recipient,
      description,
      user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Barang keluar berhasil dicatat',
      transaction_number: result.transactionNumber
    });
  } catch (err) {
    console.error('Create stock out error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal mencatat barang keluar'
    });
  }
});

// Update stock out
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { transaction_date, product_id, quantity, recipient, description } = req.body;
    
    if (!transaction_date || !product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal, produk, dan jumlah harus diisi'
      });
    }

    await updateStockOut(req.params.id, {
      transaction_date, product_id, quantity, recipient, description
    }, req.user.id);

    res.json({
      success: true,
      message: 'Barang keluar berhasil diperbarui'
    });
  } catch (err) {
    console.error('Update stock out error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui barang keluar'
    });
  }
});

// Delete stock out
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await deleteStockOut(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Barang keluar berhasil dihapus'
    });
  } catch (err) {
    console.error('Delete stock out error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus barang keluar'
    });
  }
});

// Helper function to generate transaction number
async function generateTransaction(req) {
  const date = new Date();
  const stockInCount = await getStockInByDate(date.toISOString().split('T')[0]);
  const stockOutCount = await getStockOutByDate(date.toISOString().split('T')[0]);
  
  const count = Math.max(stockInCount, stockOutCount) + 1;
  const transactionNumber = generateTransactionNumber('BK', date) + String(count).padStart(3, '0');
  
  return { transactionNumber };
}

module.exports = router;
