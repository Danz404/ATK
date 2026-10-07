const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getStockReport,
  getStockInReport,
  getStockOutReport,
  getLowStockReport,
  getInventoryValueReport,
  getCategorySummary
} = require('../controllers/report.controller');

// Get stock report
router.get('/stock', verifyToken, async (req, res) => {
  try {
    const { category_id, status, search } = req.query;
    const report = await getStockReport(category_id, status, search);
    
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Get stock report error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan stok'
    });
  }
});

// Get stock in report
router.get('/stock-in', verifyToken, async (req, res) => {
  try {
    const { period, start_date, end_date } = req.query;
    const effectivePeriod = start_date || end_date ? 'custom' : (period || 'month');
    const report = await getStockInReport(effectivePeriod, start_date, end_date);
    
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Get stock in report error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan barang masuk'
    });
  }
});

// Get stock out report
router.get('/stock-out', verifyToken, async (req, res) => {
  try {
    const { period, start_date, end_date } = req.query;
    const effectivePeriod = start_date || end_date ? 'custom' : (period || 'month');
    const report = await getStockOutReport(effectivePeriod, start_date, end_date);
    
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Get stock out report error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan barang keluar'
    });
  }
});

// Get low stock report
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const report = await getLowStockReport();
    
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Get low stock report error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan stok minimum'
    });
  }
});

// Get inventory value report
router.get('/inventory-value', verifyToken, async (req, res) => {
  try {
    const { category_id } = req.query;
    const report = await getInventoryValueReport(category_id);
    
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    console.error('Get inventory value report error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan nilai persediaan'
    });
  }
});

// Get category summary
router.get('/category-summary', verifyToken, async (req, res) => {
  try {
    const summary = await getCategorySummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error('Get category summary error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil ringkasan kategori'
    });
  }
});

module.exports = router;
