const db = require('../database/db');

// Get stock report
const getStockReport = async (category_id = null, status = null, search = '') => {
  let query = `
    SELECT p.id, p.code, p.name, c.name as category_name, 
           u.name as unit_name, p.stock, p.demand, 
           p.current_price, 
           (p.stock * p.current_price) as total_value,
           p.minimum_stock,
           CASE 
             WHEN p.stock = 0 THEN 'HABIS'
             WHEN p.stock <= p.minimum_stock THEN 'STOK MINIMUM'
             ELSE 'AMAN'
           END as status_stock,
           p.location, p.description
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
  `;
  const params = [];

  if (category_id) {
    query += ` WHERE p.category_id = ?`;
    params.push(category_id);
  } else if (status) {
    if (status === 'AMAN') {
      query += ` WHERE p.stock > p.minimum_stock`;
    } else if (status === 'STOK MINIMUM') {
      query += ` WHERE p.stock <= p.minimum_stock AND p.stock > 0`;
    } else if (status === 'HABIS') {
      query += ` WHERE p.stock = 0`;
    }
  } else if (search) {
    query += ` WHERE p.code LIKE ? OR p.name LIKE ?`;
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY p.code`;

  const [reports] = await db.execute(query, params);

  // Calculate totals
  const [totals] = await db.execute(
    `SELECT 
       SUM(stock) as total_stock,
       SUM(demand) as total_demand,
       SUM(stock * current_price) as total_value
     FROM products`
  );

  return {
    data: reports,
    totals: totals[0]
  };
};

// Get stock in report
const getStockInReport = async (period = 'month', start_date = null, end_date = null) => {
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
  `;

  if (period === 'day') {
    query += ` WHERE DATE(si.transaction_date) = CURDATE()`;
  } else if (period === 'week') {
    query += ` WHERE YEARWEEK(si.transaction_date, 1) = YEARWEEK(CURDATE(), 1)`;
  } else if (period === 'month') {
    query += ` WHERE YEAR(si.transaction_date) = YEAR(CURDATE()) AND MONTH(si.transaction_date) = MONTH(CURDATE())`;
  } else if (period === 'year') {
    query += ` WHERE YEAR(si.transaction_date) = YEAR(CURDATE())`;
  } else if (start_date && end_date) {
    query += ` WHERE si.transaction_date BETWEEN ? AND ?`;
  }

  const [reports] = await db.execute(query, start_date && end_date ? [start_date, end_date] : []);

  // Calculate totals
  const [totals] = await db.execute(
    `SELECT 
       SUM(quantity) as total_quantity,
       SUM(quantity * price) as total_value
     FROM stock_in`
  );

  return {
    data: reports,
    totals: totals[0]
  };
};

// Get stock out report
const getStockOutReport = async (period = 'month', start_date = null, end_date = null) => {
  let query = `
    SELECT so.*, 
           p.code as product_code, 
           p.name as product_name,
           u.name as unit_name,
           p.location
    FROM stock_out so
    LEFT JOIN products p ON so.product_id = p.id
    LEFT JOIN units u ON p.unit_id = u.id
  `;

  if (period === 'day') {
    query += ` WHERE DATE(so.transaction_date) = CURDATE()`;
  } else if (period === 'week') {
    query += ` WHERE YEARWEEK(so.transaction_date, 1) = YEARWEEK(CURDATE(), 1)`;
  } else if (period === 'month') {
    query += ` WHERE YEAR(so.transaction_date) = YEAR(CURDATE()) AND MONTH(so.transaction_date) = MONTH(CURDATE())`;
  } else if (period === 'year') {
    query += ` WHERE YEAR(so.transaction_date) = YEAR(CURDATE())`;
  } else if (start_date && end_date) {
    query += ` WHERE so.transaction_date BETWEEN ? AND ?`;
  }

  const [reports] = await db.execute(query, start_date && end_date ? [start_date, end_date] : []);

  // Calculate totals
  const [totals] = await db.execute(
    `SELECT 
       SUM(quantity) as total_quantity,
       COUNT(*) as total_transactions
     FROM stock_out`
  );

  return {
    data: reports,
    totals: totals[0]
  };
};

// Get low stock report
const getLowStockReport = async () => {
  const [reports] = await db.execute(
    `SELECT p.id, p.code, p.name, c.name as category_name, 
            u.name as unit_name, p.stock, p.minimum_stock,
            CASE 
              WHEN p.stock = 0 THEN 'HABIS'
              WHEN p.stock <= p.minimum_stock THEN 'STOK MINIMUM'
              ELSE 'AMAN'
            END as status_stock,
            p.location
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN units u ON p.unit_id = u.id
     WHERE p.stock <= p.minimum_stock
     ORDER BY p.stock ASC`
  );

  return reports;
};

// Get inventory value report
const getInventoryValueReport = async (category_id = null) => {
  let query = `
    SELECT p.id, p.code, p.name, c.name as category_name, 
           u.name as unit_name, p.stock, p.current_price, 
           (p.stock * p.current_price) as total_value,
           CASE 
             WHEN p.stock = 0 THEN 'HABIS'
             WHEN p.stock <= p.minimum_stock THEN 'STOK MINIMUM'
             ELSE 'AMAN'
           END as status_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN units u ON p.unit_id = u.id
  `;

  if (category_id) {
    query += ` WHERE p.category_id = ?`;
  }

  query += ` ORDER BY p.code`;

  const [reports] = await db.execute(query, category_id ? [category_id] : []);

  // Calculate totals
  const [totals] = await db.execute(
    `SELECT 
       SUM(stock) as total_stock,
       SUM(stock * current_price) as total_value
     FROM products`
  );

  return {
    data: reports,
    totals: totals[0]
  };
};

// Get category summary
const getCategorySummary = async () => {
  const [summary] = await db.execute(
    `SELECT c.name as category_name, 
            COUNT(p.id) as product_count,
            COALESCE(SUM(p.stock), 0) as total_stock,
            COALESCE(SUM(p.stock * p.current_price), 0) as total_value
     FROM categories c
     LEFT JOIN products p ON c.id = p.category_id
     GROUP BY c.id, c.name
     ORDER BY c.name`
  );

  return summary;
};

module.exports = {
  getStockReport,
  getStockInReport,
  getStockOutReport,
  getLowStockReport,
  getInventoryValueReport,
  getCategorySummary
};
