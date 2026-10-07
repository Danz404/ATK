const db = require('../database/db');

// Create stock out (Barang Keluar)
const createStockOut = async (data) => {
  const { transaction_number, transaction_date, product_id, quantity, recipient, description, user_id } = data;

  // Get product
  const [product] = await db.execute(`SELECT * FROM products WHERE id = ?`, [product_id]);
  
  if (!product.length) {
    throw new Error('Produk tidak ditemukan');
  }

  // Check stock availability
  if (product[0].stock < quantity) {
    throw new Error('Stok tidak mencukupi');
  }

  const oldStock = product[0].stock;
  const newStock = oldStock - quantity;

  // Update product stock
  await db.execute(
    `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStock, product_id]
  );

  // Update demand counter
  await db.execute(
    `UPDATE products SET demand = demand + ? WHERE id = ?`,
    [quantity, product_id]
  );

  // Create stock out record
  const [result] = await db.execute(
    `INSERT INTO stock_out (transaction_number, transaction_date, product_id, quantity, recipient, description, user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [transaction_number, transaction_date, product_id, quantity, recipient, description, user_id]
  );

  // Log audit
  await logAudit(user_id, 'CREATE_STOCK_OUT', 'stock_out', result.insertId, null, JSON.stringify({ ...data, stock_before: oldStock, stock_after: newStock }));

  return result.insertId;
};

// Get all stock out
const getAllStockOut = async (search = '', product_id = null, start_date = null, end_date = null, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  let query = `
    SELECT so.*, 
           p.code as product_code, 
           p.name as product_name,
           u.name as unit_name,
           u.code as unit_code,
           p.location
    FROM stock_out so
    LEFT JOIN products p ON so.product_id = p.id
    LEFT JOIN units u ON p.unit_id = u.id
    WHERE so.transaction_number LIKE ? 
       OR p.code LIKE ? 
       OR p.name LIKE ?
  `;
  const params = [searchPattern, searchPattern, searchPattern];

  if (product_id) {
    query += ` AND so.product_id = ?`;
    params.push(product_id);
  }

  if (start_date && end_date) {
    query += ` AND so.transaction_date BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ` AND so.transaction_date >= ?`;
    params.push(start_date);
  } else if (end_date) {
    query += ` AND so.transaction_date <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY so.transaction_date DESC, so.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [stockOuts] = await db.execute(query, params);

  // Get total count
  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM stock_out so
     LEFT JOIN products p ON so.product_id = p.id
     WHERE so.transaction_number LIKE ? 
        OR p.code LIKE ? 
        OR p.name LIKE ?`,
    [searchPattern, searchPattern, searchPattern]
  );

  return {
    data: stockOuts,
    total: countResult[0].total,
    page,
    limit,
    totalPages: Math.ceil(countResult[0].total / limit)
  };
};

// Get stock out by ID
const getStockOutById = async (id) => {
  const [stockOuts] = await db.execute(
    `SELECT so.*, 
            p.code as product_code, 
            p.name as product_name,
            u.name as unit_name
     FROM stock_out so
     LEFT JOIN products p ON so.product_id = p.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE so.id = ?`,
    [id]
  );
  return stockOuts[0];
};

// Update stock out
const updateStockOut = async (id, data, user_id) => {
  const { transaction_date, product_id, quantity, recipient, description } = data;

  // Get old record
  const [oldRecord] = await db.execute(`SELECT * FROM stock_out WHERE id = ?`, [id]);
  
  // Get products
  const [oldProduct] = await db.execute(`SELECT * FROM products WHERE id = ?`, [oldRecord[0].product_id]);
  const currentProduct = await db.execute(`SELECT * FROM products WHERE id = ?`, [product_id]);
  
  const oldStock = currentProduct[0][0].stock;
  const quantityDiff = quantity - oldRecord[0].quantity;
  const newStock = oldStock - quantityDiff;

  // Update product stock
  await db.execute(
    `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStock, product_id]
  );

  // Update demand
  await db.execute(
    `UPDATE products SET demand = demand - ? WHERE id = ?`,
    [quantityDiff, product_id]
  );

  // Update stock out record
  await db.execute(
    `UPDATE stock_out 
     SET transaction_date = ?, product_id = ?, quantity = ?, recipient = ?, description = ?
     WHERE id = ?`,
    [transaction_date, product_id, quantity, recipient, description, id]
  );

  // Log audit
  await logAudit(user_id, 'UPDATE_STOCK_OUT', 'stock_out', id, JSON.stringify(oldRecord[0]), JSON.stringify(data));

  return id;
};

// Delete stock out
const deleteStockOut = async (id, user_id) => {
  const [oldRecord] = await db.execute(`SELECT * FROM stock_out WHERE id = ?`, [id]);
  
  // Get product
  const [product] = await db.execute(
    `SELECT * FROM products WHERE id = ?`, 
    [oldRecord[0].product_id]
  );

  const oldStock = product[0].stock;
  const newStock = oldStock + oldRecord[0].quantity;

  // Update product stock
  await db.execute(
    `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStock, oldRecord[0].product_id]
  );

  // Update demand
  await db.execute(
    `UPDATE products SET demand = demand - ? WHERE id = ?`,
    [oldRecord[0].quantity, oldRecord[0].product_id]
  );

  // Log audit
  await logAudit(user_id, 'DELETE_STOCK_OUT', 'stock_out', id, JSON.stringify(oldRecord[0]), null);

  await db.execute(`DELETE FROM stock_out WHERE id = ?`, [id]);
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
  createStockOut, 
  getAllStockOut, 
  getStockOutById, 
  updateStockOut, 
  deleteStockOut,
  generateTransactionNumber: require('./stockIn.controller').generateTransactionNumber
};
