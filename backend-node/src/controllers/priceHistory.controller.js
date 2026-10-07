const db = require('../database/db');

// Get all price history
const getAllPriceHistory = async (search = '', product_id = null, start_date = null, end_date = null, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  let query = `
    SELECT ph.*, 
           p.code as product_code, 
           p.name as product_name,
           u.name as unit_name
    FROM price_history ph
    LEFT JOIN products p ON ph.product_id = p.id
    LEFT JOIN units u ON p.unit_id = u.id
    WHERE p.code LIKE ? 
       OR p.name LIKE ?
       OR ph.old_price LIKE ?
       OR ph.new_price LIKE ?
  `;
  const params = [searchPattern, searchPattern, searchPattern, searchPattern];

  if (product_id) {
    query += ` AND ph.product_id = ?`;
    params.push(product_id);
  }

  if (start_date && end_date) {
    query += ` AND ph.created_at BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  }

  query += ` ORDER BY ph.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [histories] = await db.execute(query, params);

  // Get total count
  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM price_history ph
     LEFT JOIN products p ON ph.product_id = p.id
     WHERE p.code LIKE ? 
        OR p.name LIKE ?
        OR ph.old_price LIKE ?
        OR ph.new_price LIKE ?`,
    [searchPattern, searchPattern, searchPattern, searchPattern]
  );

  return {
    data: histories,
    total: countResult[0].total,
    page,
    limit,
    totalPages: Math.ceil(countResult[0].total / limit)
  };
};

// Create price history record
const createPriceHistory = async (data) => {
  const { product_id, old_price, new_price, difference, percentage, description, user_id } = data;

  const [result] = await db.execute(
    `INSERT INTO price_history (product_id, old_price, new_price, difference, percentage, description, user_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [product_id, old_price, new_price, difference, percentage, description, user_id]
  );

  // Update product current and previous price
  await db.execute(
    `UPDATE products 
     SET previous_price = ?, current_price = ? 
     WHERE id = ?`,
    [old_price, new_price, product_id]
  );

  // Log audit
  await logAudit(user_id, 'UPDATE_PRICE', 'price_history', result.insertId, null, JSON.stringify(data));

  return result.insertId;
};

// Update price history
const updatePriceHistory = async (id, data, user_id) => {
  const { old_price, new_price, difference, percentage, description } = data;

  // Get old record
  const [oldRecord] = await db.execute(`SELECT * FROM price_history WHERE id = ?`, [id]);

  // Get product
  const [product] = await db.execute(`SELECT * FROM products WHERE id = ?`, [oldRecord[0].product_id]);

  // Update product prices
  if (product[0].previous_price == oldRecord[0].old_price && product[0].current_price == oldRecord[0].new_price) {
    await db.execute(
      `UPDATE products 
       SET previous_price = ?, current_price = ? 
       WHERE id = ?`,
      [old_price, new_price, product[0].id]
    );
  }

  await db.execute(
    `UPDATE price_history 
     SET old_price = ?, new_price = ?, difference = ?, percentage = ?, description = ?
     WHERE id = ?`,
    [old_price, new_price, difference, percentage, description, id]
  );

  // Log audit
  await logAudit(user_id, 'UPDATE_PRICE_HISTORY', 'price_history', id, JSON.stringify(oldRecord[0]), JSON.stringify(data));

  return id;
};

// Delete price history
const deletePriceHistory = async (id, user_id) => {
  const [oldRecord] = await db.execute(`SELECT * FROM price_history WHERE id = ?`, [id]);

  // Log audit
  await logAudit(user_id, 'DELETE_PRICE_HISTORY', 'price_history', id, JSON.stringify(oldRecord[0]), null);

  await db.execute(`DELETE FROM price_history WHERE id = ?`, [id]);
  return id;
};

// Get price history for a product
const getPriceHistoryByProduct = async (product_id) => {
  const [histories] = await db.execute(
    `SELECT ph.*, 
            p.code as product_code, 
            p.name as product_name
     FROM price_history ph
     LEFT JOIN products p ON ph.product_id = p.id
     WHERE ph.product_id = ?
     ORDER BY ph.created_at DESC`,
    [product_id]
  );
  return histories;
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
  getAllPriceHistory, 
  createPriceHistory, 
  updatePriceHistory, 
  deletePriceHistory,
  getPriceHistoryByProduct
};
