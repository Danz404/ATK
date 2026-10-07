const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD !== undefined && process.env.DB_PASSWORD !== '' ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'atk_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

// Test connection
pool.getConnection()
  .then(conn => {
    console.log('✓ Connected to MySQL database');
    conn.release();
  })
  .catch(err => {
    console.error('✗ Database connection failed:', err);
    process.exit(1);
  });

module.exports = pool;
