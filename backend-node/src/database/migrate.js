const db = require('./db');
const createTablesSQL = require('./schema');

// Split SQL statements
function splitStatements(sql) {
  return sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);
}

// Run migrations
async function migrate() {
  console.log('Menjalankan migrasi database...');

  try {
    const statements = splitStatements(createTablesSQL);

    for (const statement of statements) {
      await db.execute(statement);
    }

    console.log('✓ Migrasi database berhasil');
    console.log('✓ Semua tabel telah dibuat');
  } catch (err) {
    console.error('✗ Error saat menjalankan migrasi:', err);
    process.exit(1);
  }
}

// Run migration
migrate();
