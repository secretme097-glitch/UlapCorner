/**
 * Cleanup Script: Remove temporary seed products from database
 * These products were auto-seeded by db.js and not added by admin/staff.
 */
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const TEMP_PRODUCT_NAMES = [
  'CyberPulse 5000',
  'NeonCloud X',
  'Quantum Coil',
  'Synthwave Juice (Mango)'
];

async function cleanup() {
  const DB_FILE = path.join(__dirname, 'data.db');
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  console.log('\n🔍 Checking for temporary seed products...\n');

  // Show current products
  const allProducts = await db.all('SELECT id, name, parent_brand_name, category, stock FROM products');
  console.log(`📦 Total products in database: ${allProducts.length}`);
  allProducts.forEach(p => {
    const isTemp = TEMP_PRODUCT_NAMES.includes(p.name);
    console.log(`  ${isTemp ? '🗑️  [WILL DELETE]' : '✅  [KEEP]'} ID:${p.id} - ${p.name} (${p.category}, stock: ${p.stock})`);
  });

  // Delete temporary products
  for (const name of TEMP_PRODUCT_NAMES) {
    const result = await db.run('DELETE FROM products WHERE name = ?', name);
    if (result.changes > 0) {
      console.log(`\n❌ Deleted: "${name}"`);
    } else {
      console.log(`\n⚪ Not found (already removed): "${name}"`);
    }
  }

  // Show remaining products
  const remaining = await db.all('SELECT id, name, category, stock FROM products');
  console.log(`\n✅ Cleanup complete. ${remaining.length} products remain in database.`);
  remaining.forEach(p => {
    console.log(`  📦 ID:${p.id} - ${p.name} (${p.category}, stock: ${p.stock})`);
  });

  // Also clean up the cyberadmin@gmail.com user if it somehow exists
  const cyberAdmin = await db.get("SELECT id, email FROM users WHERE email = 'cyberadmin@gmail.com'");
  if (cyberAdmin) {
    await db.run("DELETE FROM users WHERE email = 'cyberadmin@gmail.com'");
    console.log(`\n🗑️  Removed stale admin account: cyberadmin@gmail.com`);
  } else {
    console.log(`\n✅ No stale cyberadmin@gmail.com account found.`);
  }

  await db.close();
  console.log('\n🏁 Database cleanup finished.\n');
}

cleanup().catch(err => {
  console.error('Cleanup script error:', err);
  process.exit(1);
});
