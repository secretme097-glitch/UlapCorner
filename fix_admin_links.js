const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'admin');
const files = ['dashboard.html', 'inventory-audit.html', 'payroll.html', 'shift-scheduling.html', 'staff-attendance.html'];

const linkToAdd = `
        <a href="user-management.html" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/70 hover:bg-white/5 hover:text-white text-xs transition text-left">
          <span>🧑‍💼</span> User Management
        </a>`;

for (const file of files) {
  const filePath = path.join(adminDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('user-management.html')) {
      // Find the inventory-audit link to append after
      const regex = /(<a href="inventory-audit\.html".*?<\/a>)/s;
      content = content.replace(regex, `$1${linkToAdd}`);
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${file}`);
    }
  }
}
