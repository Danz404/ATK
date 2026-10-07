const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  createStockIn,
  getAllStockIn,
  getStockInById,
  updateStockIn,
  deleteStockIn,
  generateTransactionNumber,
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
    const transactionNumber = generateTransactionNumber('BM', date) + String(count).padStart(3, '0');
    
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

// Get all stock in
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, product_id, start_date, end_date, page = 1, limit = 10 } = req.query;
    const stockIns = await getAllStockIn(search, product_id, start_date, end_date, page, limit);
    
    res.json({
      success: true,
      data: stockIns
    });
  } catch (err) {
    console.error('Get stock in error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data barang masuk'
    });
  }
});

// Get stock in by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const stockIn = await getStockInById(req.params.id);
    
    if (!stockIn) {
      return res.status(404).json({
        success: false,
        message: 'Barang masuk tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      data: stockIn
    });
  } catch (err) {
    console.error('Get stock in error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data barang masuk'
    });
  }
});

// Create stock in
router.post('/', verifyToken, async (req, res) => {
  try {
    const { transaction_date, product_id, quantity, price, supplier, description } = req.body;
    
    if (!transaction_date || !product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal, produk, dan jumlah harus diisi'
      });
    }

    const result = await generateTransaction(req);

    const stockInId = await createStockIn({
      transaction_number: result.transactionNumber,
      transaction_date,
      product_id,
      quantity,
      price: price || 0,
      supplier,
      description,
      user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Barang masuk berhasil dicatat',
      transaction_number: result.transactionNumber
    });
  } catch (err) {
    console.error('Create stock in error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Gagal mencatat barang masuk'
    });
  }
});

// Update stock in
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { transaction_date, product_id, quantity, price, supplier, description } = req.body;
    
    if (!transaction_date || !product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal, produk, dan jumlah harus diisi'
      });
    }

    await updateStockIn(req.params.id, {
      transaction_date, product_id, quantity, price, supplier, description
    }, req.user.id);

    res.json({
      success: true,
      message: 'Barang masuk berhasil diperbarui'
    });
  } catch (err) {
    console.error('Update stock in error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui barang masuk'
    });
  }
});

// Delete stock in
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await deleteStockIn(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Barang masuk berhasil dihapus'
    });
  } catch (err) {
    console.error('Delete stock in error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus barang masuk'
    });
  }
});

// Helper function to generate transaction number
async function generateTransaction(req) {
  const date = new Date();
  const stockInCount = await getStockInByDate(date.toISOString().split('T')[0]);
  const stockOutCount = await getStockOutByDate(date.toISOString().split('T')[0]);
  
  const count = Math.max(stockInCount, stockOutCount) + 1;
  const transactionNumber = generateTransactionNumber('BM', date) + String(count).padStart(3, '0');
  
  return { transactionNumber };
}

module.exports = router;
