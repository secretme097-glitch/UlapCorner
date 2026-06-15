const fs = require('fs');
const files = [
  'f:/cyber-vape-main/admin/inventory-audit.html',
  'f:/cyber-vape-main/admin/payroll.html',
  'f:/cyber-vape-main/admin/shift-scheduling.html',
  'f:/cyber-vape-main/admin/staff-attendance.html'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/CyberAPI\.get\("inventory"/g, 'CyberAPI.get("admin/inventory"');
  content = content.replace(/CyberAPI\.post\("inventory"/g, 'CyberAPI.post("admin/inventory"');
  content = content.replace(/CyberAPI\.get\("payroll"/g, 'CyberAPI.get("admin/payroll"');
  content = content.replace(/CyberAPI\.post\("payroll"/g, 'CyberAPI.post("admin/payroll"');
  content = content.replace(/CyberAPI\.get\("shifts"/g, 'CyberAPI.get("admin/shifts"');
  content = content.replace(/CyberAPI\.post\("shifts"/g, 'CyberAPI.post("admin/shifts"');
  content = content.replace(/CyberAPI\.get\("attendance"/g, 'CyberAPI.get("admin/attendance"');
  content = content.replace(/CyberAPI\.post\("attendance"/g, 'CyberAPI.post("admin/attendance"');
  fs.writeFileSync(file, content, 'utf8');
});

console.log("Replaced CyberAPI calls in admin files.");
