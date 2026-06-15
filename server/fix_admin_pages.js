const fs = require('fs');
const files = [
  'f:/cyber-vape-main/admin/payroll.html',
  'f:/cyber-vape-main/admin/shift-scheduling.html',
  'f:/cyber-vape-main/admin/inventory-audit.html'
];

// The common broken sidebar that all 3 files share
const oldSidebar = `<aside class="fixed left-0 top-0 h-screen w-64 bg-surface-charcoal/80 backdrop-blur-2xl border-r border-white/5 shadow-2xl shadow-glow-purple/20 flex flex-col py-8 z-50">
  <div class="px-6 mb-10">
    <h1 class="font-display-lg text-headline-md text-primary-container uppercase tracking-tighter">Ulap Corner</h1>
    <p class="font-label-caps text-label-caps text-on-surface-variant opacity-60">Admin Terminal</p>
  </div>
  <nav class="flex-grow flex flex-col gap-1">
    <a class="flex items-center gap-3 text-on-surface-variant py-3 px-6 opacity-70 hover:bg-white/5 hover:opacity-100 transition-all duration-200" href="../admin.html">
      <span class="material-symbols-outlined">dashboard</span>
      <span class="font-label-caps text-label-caps">Dashboard</span>
    </a>
    <a class="flex items-center gap-3 text-on-surface-variant py-3 px-6 opacity-70 hover:bg-white/5 hover:opacity-100 transition-all duration-200" href="staff-attendance.html">
      <span class="material-symbols-outlined">event_available</span>
      <span class="font-label-caps text-label-caps">Attendance</span>
    </a>
    <a class="flex items-center gap-3 text-on-surface-variant py-3 px-6 opacity-70 hover:bg-white/5 hover:opacity-100 transition-all duration-200" href="payroll.html">
      <span class="material-symbols-outlined">payments</span>
      <span class="font-label-caps text-label-caps">Payroll</span>
    </a>
    <a class="flex items-center gap-3 text-on-surface-variant py-3 px-6 opacity-70 hover:bg-white/5 hover:opacity-100 transition-all duration-200" href="shift-scheduling.html">
      <span class="material-symbols-outlined">group</span>
      <span class="font-label-caps text-label-caps">Staff Scheduling</span>
    </a>
    <a class="flex items-center gap-3 text-on-surface-variant py-3 px-6 opacity-70 hover:bg-white/5 hover:opacity-100 transition-all duration-200" href="inventory-audit.html">
      <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">inventory_2</span>
      <span class="font-label-caps text-label-caps">Inventory</span>
    </a>
    <a class="flex items-center gap-3 text-on-surface-variant py-3 px-6 opacity-70 hover:bg-white/5 hover:opacity-100 transition-all duration-200" href="../store/shop.html" target="_blank">
      <span class="material-symbols-outlined">local_shipping</span>
      <span class="font-label-caps text-label-caps">Store Front</span>
    </a>
  </nav>
  <div class="px-6 mt-auto">
    <button class="w-full py-3 px-4 rounded-lg bg-surface-container-highest/50 border border-white/10 text-on-surface-variant font-label-caps text-label-caps hover:bg-error/10 hover:text-error transition-all duration-300 flex items-center justify-center gap-2">
      <span class="material-symbols-outlined text-[18px]">logout</span>
      Logout
    </button>
  </div>
</aside>`;

// Build the new sidebar with a PLACEHOLDER for active page
function newSidebar(activePage) {
  const pages = [
    { href: 'dashboard.html', icon: 'dashboard', label: 'Dashboard', key: 'dashboard' },
    { href: 'staff-attendance.html', icon: 'event_available', label: 'Attendance', key: 'attendance' },
    { href: 'payroll.html', icon: 'payments', label: 'Payroll', key: 'payroll' },
    { href: 'shift-scheduling.html', icon: 'group', label: 'Staff Scheduling', key: 'scheduling' },
    { href: 'inventory-audit.html', icon: 'inventory_2', label: 'Inventory', key: 'inventory' },
    { href: '../store/shop.html', icon: 'storefront', label: 'Store Front ↗', key: 'store', target: ' target="_blank"' }
  ];

  const navLinks = pages.map(p => {
    const isActive = p.key === activePage;
    const cls = isActive
      ? 'flex items-center gap-3 py-2.5 px-4 rounded-xl bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 text-xs font-medium transition-all'
      : 'flex items-center gap-3 py-2.5 px-4 rounded-xl text-white/60 hover:bg-white/5 hover:text-white text-xs font-medium transition-all';
    const target = p.target || '';
    return `    <a class="${cls}" href="${p.href}"${target}>\n      <span class="material-symbols-outlined text-lg">${p.icon}</span> ${p.label}\n    </a>`;
  }).join('\n');

  return `<aside class="fixed left-0 top-0 h-screen w-64 bg-[#070a12]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col py-8 z-50">
  <div class="px-6 mb-8 flex items-center gap-3">
    <img src="../assets/ulapcorner_logo.jpg" alt="Logo" class="h-9 w-auto rounded-lg shadow-[0_0_10px_rgba(0,240,255,0.3)]" />
    <div>
      <h1 class="font-bold text-sm text-cyan-300 uppercase tracking-[0.2em]">Ulap Corner</h1>
      <p class="text-[9px] text-white/40 tracking-wider uppercase">Admin Terminal</p>
    </div>
  </div>
  <nav class="flex-grow flex flex-col gap-1 px-3">
${navLinks}
  </nav>
  <div class="px-4 mt-auto space-y-2">
    <a href="/" class="block text-center py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-cyan-100 hover:bg-cyan-400/10 transition uppercase tracking-wider font-semibold">Landing</a>
    <button class="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
      <span class="material-symbols-outlined text-sm">logout</span> Logout
    </button>
  </div>
</aside>`;
}

const headFix = [
  // Fix broken CDN
  { from: '<script src="cdn.tailwindcss.com/3.4.16"></script>',
    to: '<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>\n  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />' },
];

// Add inline styles after </head> or before <body>
const inlineStyles = `
  <style>
    body {
      min-height: 100vh;
      background: radial-gradient(circle at top, rgba(0, 240, 255, 0.08), transparent 30%),
                  radial-gradient(circle at bottom right, rgba(188, 19, 254, 0.08), transparent 25%),
                  linear-gradient(180deg, #06070f 0%, #090b12 100%);
      color: #e3e2e7;
    }
    .glass-card, .glass-panel {
      background: rgba(15, 18, 32, 0.85) !important;
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
    }
    .glass-card:hover, .glass-panel:hover {
      border-color: rgba(0, 240, 255, 0.15);
    }
    select option { background-color: #0f1220; color: #fff; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  </style>`;

const pageKeys = {
  'payroll.html': 'payroll',
  'shift-scheduling.html': 'scheduling',
  'inventory-audit.html': 'inventory'
};

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Fix CDN
  headFix.forEach(fix => {
    content = content.replace(fix.from, fix.to);
  });

  // 2. Add inline styles (before </head>)
  content = content.replace('</head>', inlineStyles + '\n</head>');

  // 3. Replace sidebar
  const fileName = filePath.split('/').pop();
  const pageKey = pageKeys[fileName];
  
  // Normalize whitespace for matching
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedOld = oldSidebar.replace(/\r\n/g, '\n');
  
  if (normalizedContent.includes(normalizedOld)) {
    content = normalizedContent.replace(normalizedOld, newSidebar(pageKey));
  } else {
    // Try a regex approach for the sidebar
    const sidebarRegex = /<aside[^>]*>[\s\S]*?<\/aside>/;
    content = normalizedContent.replace(sidebarRegex, newSidebar(pageKey));
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed:', filePath);
});

console.log('All done!');
