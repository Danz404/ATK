const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getAllSettings,
  updateSetting,
  updateCompanyInfo,
  getCompanySettings,
  updateGlobalMinStock,
  getSettings
} = require('../controllers/settings.controller');

// Get all settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await getAllSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil pengaturan'
    });
  }
});

// Get company settings
router.get('/company', verifyToken, async (req, res) => {
  try {
    const settings = await getCompanySettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (err) {
    console.error('Get company settings error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil pengaturan perusahaan'
    });
  }
});

// Update company info
router.put('/company', verifyToken, async (req, res) => {
  try {
    const { company_name, company_address, company_phone, contact_person, default_min_stock, default_unit, transaction_format_in, transaction_format_out } = req.body;
    
    await updateCompanyInfo({
      company_name,
      company_address,
      company_phone,
      contact_person,
      default_min_stock,
      default_unit,
      transaction_format_in,
      transaction_format_out
    }, req.user.id);

    res.json({
      success: true,
      message: 'Pengaturan perusahaan berhasil diperbarui'
    });
  } catch (err) {
    console.error('Update company settings error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui pengaturan perusahaan'
    });
  }
});

// Update global minimum stock
router.put('/min-stock', verifyToken, async (req, res) => {
  try {
    const { min_stock } = req.body;
    
    if (!min_stock || parseInt(min_stock) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Batas stok minimum harus valid'
      });
    }

    await updateGlobalMinStock(min_stock, req.user.id);

    res.json({
      success: true,
      message: 'Batas stok minimum berhasil diperbarui'
    });
  } catch (err) {
    console.error('Update min stock error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui batas stok minimum'
    });
  }
});

// Update specific setting
router.put('/:key', verifyToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    await updateSetting(key, value, description);

    res.json({
      success: true,
      message: 'Pengaturan berhasil diperbarui'
    });
  } catch (err) {
    console.error('Update setting error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui pengaturan'
    });
  }
});

module.exports = router;
