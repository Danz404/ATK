const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getCategories,
  getUnits,
  getDashboardStats,
  getMonthlyStats
} = require('../controllers/product.controller');

// Get all products
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, category_id, status, page = 1, limit = 10 } = req.query;
    const products = await getAllProducts(search, category_id, status, page, limit);
    
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk'
    });
  }
});

// Get low stock products
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const products = await getLowStockProducts();
    
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error('Get low stock error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data stok minimum'
    });
  }
});

// Dashboard stats
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const stats = await getDashboardStats();
    const monthlyStats = await getMonthlyStats();
    
    res.json({
      success: true,
      data: { stats, monthlyStats }
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard'
    });
  }
});

// Get categories
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const categories = await getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kategori'
    });
  }
});

// Get units
router.get('/units', verifyToken, async (req, res) => {
  try {
    const units = await getUnits();
    
    res.json({
      success: true,
      data: units
    });
  } catch (err) {
    console.error('Get units error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data satuan'
    });
  }
});

// Get product by ID (HARUS DI PALING BAWAH)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk'
    });
  }
});

// Create product
router.post('/', verifyToken, async (req, res) => {
  try {
    const { code, name, category_id, unit_id, quantity, stock, demand, current_price, minimum_stock, location, description } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Kode dan nama produk harus diisi'
      });
    }

    const product_id = await createProduct({
      code, name, category_id, unit_id, quantity, stock, demand, current_price, minimum_stock, location, description, user_id: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Produk berhasil ditambahkan',
      data: { id: product_id, code, name }
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menambahkan produk'
    });
  }
});

// Update product
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { code, name, category_id, unit_id, quantity, stock, demand, current_price, minimum_stock, location, description, status } = req.body;
    
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        message: 'Kode dan nama produk harus diisi'
      });
    }

    await updateProduct(req.params.id, {
      code, name, category_id, unit_id, quantity, stock, demand, current_price, minimum_stock, location, description, status
    }, req.user.id);

    res.json({
      success: true,
      message: 'Produk berhasil diperbarui'
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui produk'
    });
  }
});

// Delete product
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await deleteProduct(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Produk berhasil dihapus'
    });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus produk'
    });
  }
});

module.exports = router;
