const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getAllPriceHistory,
  createPriceHistory,
  updatePriceHistory,
  deletePriceHistory,
  getPriceHistoryByProduct
} = require('../controllers/priceHistory.controller');

// Get all price history
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, product_id, start_date, end_date, page = 1, limit = 10 } = req.query;
    const histories = await getAllPriceHistory(search, product_id, start_date, end_date, page, limit);
    
    res.json({
      success: true,
      data: histories
    });
  } catch (err) {
    console.error('Get price history error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data riwayat harga'
    });
  }
});

// Get price history by product
router.get('/product/:product_id', verifyToken, async (req, res) => {
  try {
    const histories = await getPriceHistoryByProduct(req.params.product_id);
    
    res.json({
      success: true,
      data: histories
    });
  } catch (err) {
    console.error('Get price history by product error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data riwayat harga'
    });
  }
});

// Create price history
router.post('/', verifyToken, async (req, res) => {
  try {
    const { product_id, old_price, new_price, description, reason } = req.body;
    const oldPrice = Number(old_price);
    const newPrice = Number(new_price);
    const difference = newPrice - oldPrice;
    const percentage = oldPrice === 0 ? 0 : (difference / oldPrice) * 100;
    
    if (!product_id || !Number.isFinite(oldPrice) || !Number.isFinite(newPrice)) {
      return res.status(400).json({
        success: false,
        message: 'Data harga tidak lengkap'
      });
    }

    const historyId = await createPriceHistory({
      product_id, old_price: oldPrice, new_price: newPrice, difference, percentage, description: description || reason, user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Riwayat harga berhasil dicatat',
      data: { id: historyId }
    });
  } catch (err) {
    console.error('Create price history error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mencatat riwayat harga'
    });
  }
});

// Update price history
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { old_price, new_price, difference, percentage, description } = req.body;
    
    await updatePriceHistory(req.params.id, {
      old_price, new_price, difference, percentage, description
    }, req.user.id);

    res.json({
      success: true,
      message: 'Riwayat harga berhasil diperbarui'
    });
  } catch (err) {
    console.error('Update price history error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui riwayat harga'
    });
  }
});

// Delete price history
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await deletePriceHistory(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Riwayat harga berhasil dihapus'
    });
  } catch (err) {
    console.error('Delete price history error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus riwayat harga'
    });
  }
});

module.exports = router;
