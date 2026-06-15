const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

const TEMP_NAMES = [
  'CyberPulse 5000',
  'NeonCloud X',
  'Quantum Coil',
  'Synthwave Juice (Mango)'
];

(async () => {
  const db = await open({ filename: path.join(__dirname, '../data.db'), driver: sqlite3.Database });

  const all = await db.all('SELECT id, name, category, stock FROM products');
  console.log('Total products:', all.length);
  all.forEach(p => {
    const t = TEMP_NAMES.includes(p.name);
    console.log((t ? '[DELETE]' : '[KEEP]  '), 'ID:' + p.id, p.name, '(' + p.category + ', stock:' + p.stock + ')');
  });

  for (const n of TEMP_NAMES) {
    const r = await db.run('DELETE FROM products WHERE name = ?', n);
    console.log(r.changes > 0 ? 'Deleted: ' + n : 'Not found: ' + n);
  }

  const ca = await db.get('SELECT id FROM users WHERE email = ?', 'cyberadmin@gmail.com');
  if (ca) {
    await db.run('DELETE FROM users WHERE email = ?', 'cyberadmin@gmail.com');
    console.log('Deleted stale cyberadmin@gmail.com');
  } else {
    console.log('No stale cyberadmin found');
  }

  const rem = await db.all('SELECT id, name FROM products');
  console.log('\nRemaining products:', rem.length);
  rem.forEach(p => console.log('  ', p.id, p.name));
  await db.close();
  console.log('\nDone');
})();
