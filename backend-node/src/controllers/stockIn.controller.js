const db = require('../database/db');

const generateTransactionNumber = (type, date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${type}-${year}${month}${day}-`;
};

const getStockInByDate = async (dateStr) => {
  const [result] = await db.execute(
    `SELECT COUNT(*) as count FROM stock_in WHERE DATE(transaction_date) = ?`,
    [dateStr]
  );
  return result[0].count;
};

const getStockOutByDate = async (dateStr) => {
  const [result] = await db.execute(
    `SELECT COUNT(*) as count FROM stock_out WHERE DATE(transaction_date) = ?`,
    [dateStr]
  );
  return result[0].count;
};

// Create stock in (Barang Masuk)
const createStockIn = async (data) => {
  const { transaction_number, transaction_date, product_id, quantity, price, supplier, description, user_id } = data;

  // Get product
  const [product] = await db.execute(`SELECT * FROM products WHERE id = ?`, [product_id]);
  
  if (!product.length) {
    throw new Error('Produk tidak ditemukan');
  }

  const oldStock = product[0].stock;
  const newStock = oldStock + quantity;

  // Update product stock
  await db.execute(
    `UPDATE products SET stock = ?, current_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStock, price, product_id]
  );

  // Create stock in record
  const [result] = await db.execute(
    `INSERT INTO stock_in (transaction_number, transaction_date, product_id, quantity, price, supplier, description, user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [transaction_number, transaction_date, product_id, quantity, price, supplier, description, user_id]
  );

  // Log audit
  await logAudit(user_id, 'CREATE_STOCK_IN', 'stock_in', result.insertId, null, JSON.stringify({ ...data, stock_before: oldStock, stock_after: newStock }));

  return result.insertId;
};

// Get all stock in
const getAllStockIn = async (search = '', product_id = null, start_date = null, end_date = null, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  let query = `
    SELECT si.*, 
           p.code as product_code, 
           p.name as product_name,
           u.name as unit_name,
           u.code as unit_code,
           u.name as unit_name,
           p.location
    FROM stock_in si
    LEFT JOIN products p ON si.product_id = p.id
    LEFT JOIN units u ON p.unit_id = u.id
    WHERE si.transaction_number LIKE ? 
       OR p.code LIKE ? 
       OR p.name LIKE ?
  `;
  const params = [searchPattern, searchPattern, searchPattern];

  if (product_id) {
    query += ` AND si.product_id = ?`;
    params.push(product_id);
  }

  if (start_date && end_date) {
    query += ` AND si.transaction_date BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ` AND si.transaction_date >= ?`;
    params.push(start_date);
  } else if (end_date) {
    query += ` AND si.transaction_date <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY si.transaction_date DESC, si.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [stockIns] = await db.execute(query, params);

  // Get total count
  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM stock_in si
     LEFT JOIN products p ON si.product_id = p.id
     WHERE si.transaction_number LIKE ? 
        OR p.code LIKE ? 
        OR p.name LIKE ?`,
    [searchPattern, searchPattern, searchPattern]
  );

  return {
    data: stockIns,
    total: countResult[0].total,
    page,
    limit,
    totalPages: Math.ceil(countResult[0].total / limit)
  };
};

// Get stock in by ID
const getStockInById = async (id) => {
  const [stockIns] = await db.execute(
    `SELECT si.*, 
            p.code as product_code, 
            p.name as product_name,
            u.name as unit_name
     FROM stock_in si
     LEFT JOIN products p ON si.product_id = p.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE si.id = ?`,
    [id]
  );
  return stockIns[0];
};

// Update stock in
const updateStockIn = async (id, data, user_id) => {
  const { transaction_date, product_id, quantity, price, supplier, description } = data;

  // Get old record
  const [oldRecord] = await db.execute(`SELECT * FROM stock_in WHERE id = ?`, [id]);
  const oldProduct = await db.execute(`SELECT * FROM products WHERE id = ?`, [oldRecord[0].product_id]);

  const oldStock = oldProduct[0][0].stock;
  const newProduct = await db.execute(`SELECT * FROM products WHERE id = ?`, [product_id]);
  const currentStock = newProduct[0][0].stock;
  
  // Calculate difference
  const quantityDiff = quantity - oldRecord[0].quantity;
  const newStock = currentStock + quantityDiff;

  // Update product stock
  await db.execute(
    `UPDATE products SET stock = ?, current_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStock, price, product_id]
  );

  // Update stock in record
  await db.execute(
    `UPDATE stock_in 
     SET transaction_date = ?, product_id = ?, quantity = ?, price = ?, supplier = ?, description = ?
     WHERE id = ?`,
    [transaction_date, product_id, quantity, price, supplier, description, id]
  );

  // Log audit
  await logAudit(user_id, 'UPDATE_STOCK_IN', 'stock_in', id, JSON.stringify(oldRecord[0]), JSON.stringify(data));

  return id;
};

// Delete stock in
const deleteStockIn = async (id, user_id) => {
  const [oldRecord] = await db.execute(`SELECT * FROM stock_in WHERE id = ?`, [id]);
  
  // Get product
  const [product] = await db.execute(
    `SELECT * FROM products WHERE id = ?`, 
    [oldRecord[0].product_id]
  );

  const oldStock = product[0].stock;
  const newStock = oldStock - oldRecord[0].quantity;

  // Update product stock
  await db.execute(
    `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStock, oldRecord[0].product_id]
  );

  // Log audit
  await logAudit(user_id, 'DELETE_STOCK_IN', 'stock_in', id, JSON.stringify(oldRecord[0]), null);

  await db.execute(`DELETE FROM stock_in WHERE id = ?`, [id]);
  return id;
};

// Helper: Log audit
const logAudit = async (user_id, action, table_name, record_id, data_before, data_after) => {
  try {
    await db.execute(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, data_before, data_after) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, action, table_name, record_id, data_before, data_after]
    );
  } catch (err) {
    console.error('Error logging audit:', err);
  }
};

module.exports = { 
  createStockIn, 
  getAllStockIn, 
  getStockInById, 
  updateStockIn, 
  deleteStockIn,
  generateTransactionNumber,
  getStockInByDate,
  getStockOutByDate
};
