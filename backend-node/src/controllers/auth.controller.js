const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

const generateToken = (userId, email, role) => {
  return jwt.sign(
    { id: userId, email: email, role: role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

const verifyPassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};

// Register new user
const register = async (name, email, password, role = 'operator') => {
  const hashedPassword = hashPassword(password);
  
  const [result] = await db.execute(
    `INSERT INTO users (name, email, password, role) 
     VALUES (?, ?, ?, ?)`,
    [name, email, hashedPassword, role]
  );
  
  return { id: result.insertId, name, email, role };
};

// Login user
const login = async (email, password) => {
  const [users] = await db.execute(
    `SELECT * FROM users WHERE email = ?`,
    [email]
  );

  if (users.length === 0) {
    return { success: false, message: 'Email atau password salah' };
  }

  const user = users[0];
  
  if (!verifyPassword(password, user.password)) {
    return { success: false, message: 'Email atau password salah' };
  }

  const token = generateToken(user.id, user.email, user.role);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

// Get user by ID
const getUserById = async (id) => {
  const [users] = await db.execute(
    `SELECT id, name, email, role, created_at 
     FROM users WHERE id = ?`,
    [id]
  );
  return users[0];
};

// Get all users
const getAllUsers = async () => {
  const [users] = await db.execute(
    `SELECT id, name, email, role, created_at 
     FROM users ORDER BY created_at DESC`
  );
  return users;
};

module.exports = { register, login, getUserById, getAllUsers };
