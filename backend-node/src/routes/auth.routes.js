const express = require('express');
const router = express.Router();
const { register, login, getAllUsers, getUserById } = require('../controllers/auth.controller');
const { verifyToken, authorize } = require('../middleware/auth');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'operator' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan password harus diisi'
      });
    }

    const user = await register(name, email, password, role);

    res.status(201).json({
      success: true,
      message: 'User berhasil didaftarkan',
      data: user
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mendaftarkan user'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password harus diisi'
      });
    }

    const result = await login(email, password);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: 'Login berhasil',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal login'
    });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data user'
    });
  }
});

// Get all users (admin only)
router.get('/users', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const users = await getAllUsers();
    
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data user'
    });
  }
});

module.exports = router;
