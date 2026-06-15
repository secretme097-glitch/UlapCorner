const fs = require('fs');
const files = [
  'f:/cyber-vape-main/admin/staff-attendance.html',
  'f:/cyber-vape-main/admin/shift-scheduling.html',
  'f:/cyber-vape-main/admin/payroll.html',
  'f:/cyber-vape-main/admin/inventory-audit.html'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/href="\.\.\/store\/shop\.html"/g, 'href="../store/shop.html" target="_blank"');
  c = c.replace(/href="\/store\/shop\.html"/g, 'href="/store/shop.html" target="_blank"');
  fs.writeFileSync(f, c, 'utf8');
  console.log('Updated:', f);
});
