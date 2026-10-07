const db = require('../database/db');

// Get all settings
const getAllSettings = async () => {
  const [settings] = await db.execute(`SELECT * FROM settings`);
  
  const result = {};
  settings.forEach(s => {
    result[s.key_name] = s.value;
  });
  
  return result;
};

// Update setting
const updateSetting = async (key_name, value, description = null) => {
  const [settings] = await db.execute(
    `SELECT id FROM settings WHERE key_name = ?`,
    [key_name]
  );

  if (settings.length) {
    await db.execute(
      `UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key_name = ?`,
      [value, key_name]
    );
  } else {
    await db.execute(
      `INSERT INTO settings (key_name, value, description) VALUES (?, ?, ?)`,
      [key_name, value, description]
    );
  }

  return key_name;
};

// Update company info
const updateCompanyInfo = async (data, user_id) => {
  const { company_name, company_address, company_phone, contact_person, default_min_stock, default_unit, transaction_format_in, transaction_format_out } = data;

  const updates = [
    { key: 'company_name', value: company_name },
    { key: 'company_address', value: company_address },
    { key: 'company_phone', value: company_phone },
    { key: 'contact_person', value: contact_person },
    { key: 'default_min_stock', value: default_min_stock },
    { key: 'default_unit', value: default_unit },
    { key: 'transaction_format_in', value: transaction_format_in },
    { key: 'transaction_format_out', value: transaction_format_out }
  ];

  for (const update of updates) {
    await updateSetting(update.key, update.value);
  }

  return updates.map(u => u.key);
};

// Get settings for company
const getCompanySettings = async () => {
  const settings = await getAllSettings();
  
  return {
    company_name: settings.company_name || 'PT / Instansi / Kantor',
    company_address: settings.company_address || 'Jl. Contoh No. 123',
    company_phone: settings.company_phone || '(021) 1234-5678',
    contact_person: settings.contact_person || 'Admin Gudang',
    default_min_stock: parseInt(settings.default_min_stock) || 5,
    default_unit: settings.default_unit || 'PCS',
    transaction_format_in: settings.transaction_format_in || 'BM-YYYYMMDD-###',
    transaction_format_out: settings.transaction_format_out || 'BK-YYYYMMDD-###'
  };
};

// Update minimum stock for all products
const updateGlobalMinStock = async (newMinStock, user_id) => {
  await db.execute(
    `UPDATE products SET minimum_stock = ?`,
    [newMinStock]
  );

  return newMinStock;
};

// Get settings with defaults
const getSettings = async () => {
  const [settings] = await db.execute(`SELECT * FROM settings`);
  
  const result = {
    company_name: 'PT / Instansi / Kantor',
    company_address: 'Jl. Contoh No. 123, Jakarta',
    company_phone: '(021) 1234-5678',
    contact_person: 'Admin Gudang',
    default_min_stock: '5',
    default_unit: 'PCS',
    transaction_format_in: 'BM-YYYYMMDD-###',
    transaction_format_out: 'BK-YYYYMMDD-###'
  };

  settings.forEach(s => {
    if (result.hasOwnProperty(s.key_name)) {
      result[s.key_name] = s.value;
    }
  });

  return result;
};

module.exports = {
  getAllSettings,
  updateSetting,
  updateCompanyInfo,
  getCompanySettings,
  updateGlobalMinStock,
  getSettings
};
