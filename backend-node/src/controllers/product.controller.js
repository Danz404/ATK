const db = require('../database/db');

// Get all products
const getAllProducts = async (search = '', category_id = null, status = null, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  let query = `
    SELECT p.*, 
           c.name as category_name, 
           u.name as unit_name, 
           u.code as unit_code,
           CASE 
             WHEN p.stock = 0 THEN 'HABIS'
             WHEN p.stock <= p.minimum_stock THEN 'STOK MINIMUM'
             ELSE 'AMAN'
           END as status_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
    WHERE p.code LIKE ? OR p.name LIKE ?
  `;
  const params = [searchPattern, searchPattern];

  if (category_id) {
    query += ` AND p.category_id = ?`;
    params.push(category_id);
  }

  if (status) {
    if (status === 'AMAN') {
      query += ` AND p.stock > p.minimum_stock`;
    } else if (status === 'STOK MINIMUM') {
      query += ` AND p.stock <= p.minimum_stock AND p.stock > 0`;
    } else if (status === 'HABIS') {
      query += ` AND p.stock = 0`;
    }
  }

  query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const [products] = await db.execute(query, params);

  // Get total count
  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM products 
     WHERE code LIKE ? OR name LIKE ?`,
    [searchPattern, searchPattern]
  );

  return {
    data: products,
    total: countResult[0].total,
    page,
    limit,
    totalPages: Math.ceil(countResult[0].total / limit)
  };
};

// Get product by ID
const getProductById = async (id) => {
  const [products] = await db.execute(
    `SELECT p.*, 
            c.name as category_name, 
            u.name as unit_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE p.id = ?`,
    [id]
  );
  return products[0];
};

// Get product by code
const getProductByCode = async (code) => {
  const [products] = await db.execute(
    `SELECT p.*, 
            c.name as category_name, 
            u.name as unit_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE p.code = ?`,
    [code]
  );
  return products[0];
};

// Create product
const createProduct = async (data) => {
  const { code, name, category_id, unit_id, quantity, stock, demand, current_price, minimum_stock, location, description, user_id } = data;

  const catId = category_id && category_id !== '' ? parseInt(category_id) : null;
  const uId = unit_id && unit_id !== '' ? parseInt(unit_id) : null;

  const [result] = await db.execute(
    `INSERT INTO products (code, name, category_id, unit_id, quantity, stock, demand, current_price, previous_price, minimum_stock, location, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [code, name, catId, uId, quantity || 0, stock || 0, demand || 0, current_price || 0, minimum_stock || 5, location || null, description || null]
  );

  // Log audit
  const [product] = await db.execute(`SELECT * FROM products WHERE id = ?`, [result.insertId]);
  await logAudit(user_id, 'CREATE', 'products', result.insertId, null, JSON.stringify(product[0]));

  return result.insertId;
};

// Update product
const updateProduct = async (id, data, user_id) => {
  const { code, name, category_id, unit_id, quantity, stock, demand, current_price, previous_price, minimum_stock, location, description, status } = data;

  const catId = category_id && category_id !== '' ? parseInt(category_id) : null;
  const uId = unit_id && unit_id !== '' ? parseInt(unit_id) : null;

  // Get old data for audit
  const [oldProduct] = await db.execute(`SELECT * FROM products WHERE id = ?`, [id]);

  await db.execute(
    `UPDATE products 
     SET code = ?, name = ?, category_id = ?, unit_id = ?, quantity = ?, stock = ?, demand = ?, 
         current_price = ?, previous_price = ?, minimum_stock = ?, location = ?, description = ?, 
         status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [code, name, catId, uId, quantity || 0, stock || 0, demand || 0, current_price || 0, previous_price || 0, minimum_stock || 5, location || null, description || null, status || 'active', id]
  );

  // Log audit
  const [newProduct] = await db.execute(`SELECT * FROM products WHERE id = ?`, [id]);
  await logAudit(user_id, 'UPDATE', 'products', id, JSON.stringify(oldProduct[0]), JSON.stringify(newProduct[0]));

  return id;
};

// Delete product
const deleteProduct = async (id, user_id) => {
  // Get old data for audit
  const [oldProduct] = await db.execute(`SELECT * FROM products WHERE id = ?`, [id]);
  await logAudit(user_id, 'DELETE', 'products', id, JSON.stringify(oldProduct[0]), null);

  await db.execute(`DELETE FROM products WHERE id = ?`, [id]);
  return id;
};

// Update stock (called from stock_in or stock_out)
const updateStock = async (product_id, quantity_change, type = 'in', user_id) => {
  const [product] = await db.execute(`SELECT * FROM products WHERE id = ?`, [product_id]);
  
  if (!product) {
    throw new Error('Produk tidak ditemukan');
  }

  let newStock = product[0].stock + quantity_change;

  // Prevent negative stock
  if (newStock < 0) {
    throw new Error('Stok tidak mencukupi');
  }

  const [result] = await db.execute(
    `UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [newStock, product_id]
  );

  // Update status berdasarkan stok baru
  if (newStock === 0) {
    await db.execute(`UPDATE products SET status = 'inactive' WHERE id = ?`, [product_id]);
  } else if (newStock > 0 && product[0].status === 'inactive') {
    await db.execute(`UPDATE products SET status = 'active' WHERE id = ?`, [product_id]);
  }

  return { product_id, old_stock: product[0].stock, new_stock: newStock };
};

// Get products with low stock
const getLowStockProducts = async () => {
  const [products] = await db.execute(
    `SELECT p.*, 
            c.name as category_name, 
            u.name as unit_name,
            CASE 
              WHEN p.stock = 0 THEN 'HABIS'
              WHEN p.stock <= p.minimum_stock THEN 'STOK MINIMUM'
              ELSE 'AMAN'
            END as status_stock
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE p.stock <= p.minimum_stock
     ORDER BY p.stock ASC`
  );
  return products;
};

// Get product categories
const getCategories = async () => {
  const [categories] = await db.execute(`SELECT * FROM categories ORDER BY name`);
  return categories;
};

// Get units
const getUnits = async () => {
  const [units] = await db.execute(`SELECT * FROM units ORDER BY name`);
  return units;
};

// Get dashboard statistics
const getDashboardStats = async () => {
  const [stats] = await db.execute(`
    SELECT 
      (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
      (SELECT COALESCE(SUM(stock), 0) FROM products) as total_stock,
      (SELECT COALESCE(SUM(demand), 0) FROM products) as total_demand,
      (SELECT COALESCE(SUM(stock * current_price), 0) FROM products) as total_value,
      (SELECT COUNT(*) FROM products WHERE stock <= minimum_stock) as low_stock_items,
      (SELECT COALESCE(SUM(quantity), 0) FROM stock_in) as total_stock_in,
      (SELECT COALESCE(SUM(quantity), 0) FROM stock_out) as total_stock_out
  `);

  return stats[0];
};

// Get monthly stock in/out data for chart
const getMonthlyStats = async (year = new Date().getFullYear()) => {
  const [data] = await db.execute(`
    SELECT 
      MONTH(transaction_date) as month,
      SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as stock_in,
      SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as stock_out
    FROM (
      SELECT transaction_date, quantity, 'in' as type FROM stock_in WHERE YEAR(transaction_date) = ?
      UNION ALL
      SELECT transaction_date, quantity, 'out' as type FROM stock_out WHERE YEAR(transaction_date) = ?
    ) as combined
    GROUP BY MONTH(transaction_date)
    ORDER BY month
  `, [year, year]);

  return data;
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
  getAllProducts, 
  getProductById, 
  getProductByCode,
  createProduct, 
  updateProduct, 
  deleteProduct,
  updateStock,
  getLowStockProducts,
  getCategories,
  getUnits,
  getDashboardStats,
  getMonthlyStats
};
