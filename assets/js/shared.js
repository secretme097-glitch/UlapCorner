// ─── Route Guard Protection ──────────────────────────────────────────────────
(function checkRouteGuard() {
  const path = window.location.pathname;
  const isLoginPage = path.endsWith("/login.html") || path.endsWith("/register.html") || path.endsWith("index.html");
  const isAdminPage = path.includes("/admin") || path.endsWith("admin.html");

  const userData = sessionStorage.getItem("cv_user");
  let user = null;
  if (userData) {
    try {
      user = JSON.parse(userData);
    } catch (e) {
      sessionStorage.removeItem("cv_user");
    }
  }

  const normalizeRole = (role) => String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
  const userRole = user?.role ? normalizeRole(user.role) : null;

  // If visiting an admin page without a valid user or role, redirect to login
  if (isAdminPage) {
    if (!user || !user.token) {
      window.location.href = "/store/login.html";
      return;
    }

    const allowedRoles = ['super_admin', 'admin', 'staff_admin', 'staff'];
    if (!allowedRoles.includes(userRole)) {
      window.location.href = "/store/shop.html";
      return;
    }

    // Task 4: Role Gating for Staff
    if (userRole === 'staff') {
      const restrictedPages = ['staff-attendance.html', 'payroll.html', 'shift-scheduling.html', 'user-management.html'];
      if (restrictedPages.some(p => path.endsWith(p))) {
        window.location.href = "/admin/dashboard.html";
        return;
      }
    }
  }

  // Hide restricted links from DOM globally if staff
  document.addEventListener('DOMContentLoaded', () => {
    if (isAdminPage && userRole === 'staff') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
  });

  // If already logged in and visiting login page, redirect to correct portal
  if (isLoginPage && user && user.token) {
    if (['super_admin', 'admin'].includes(userRole)) {
      window.location.href = "/admin/dashboard.html";
    } else if (userRole === 'staff') {
      window.location.href = "/admin/dashboard.html";
    } else {
      window.location.href = "/store/shop.html";
    }
  }
})();

// ─── Tailwind configuration (runs before Tailwind parses the DOM) ─────────────
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        "colors": {
          "on-primary": "#00363a",
          "surface-slate": "#404040",
          "secondary-container": "#b600f8",
          "primary": "#dbfcff",
          "surface-container-low": "#1a1b20",
          "on-tertiary-fixed-variant": "#3c4d00",
          "inverse-surface": "#e3e2e7",
          "inverse-primary": "#006970",
          "primary-fixed-dim": "#00dbe9",
          "surface-container-highest": "#343439",
          "error": "#ffb4ab",
          "secondary": "#ebb2ff",
          "on-secondary-fixed": "#320047",
          "on-background": "#e3e2e7",
          "on-secondary-fixed-variant": "#74009f",
          "surface-container-lowest": "#0d0e12",
          "on-secondary": "#520072",
          "on-tertiary": "#283500",
          "surface-variant": "#343439",
          "glow-purple": "rgba(188, 19, 254, 0.4)",
          "on-tertiary-fixed": "#161e00",
          "secondary-fixed": "#f8d8ff",
          "inverse-on-surface": "#2f3035",
          "surface-container": "#1e1f24",
          "tertiary-fixed-dim": "#abd600",
          "tertiary-fixed": "#c3f400",
          "surface-bright": "#38393d",
          "glow-cyan": "rgba(0, 240, 255, 0.4)",
          "secondary-fixed-dim": "#ebb2ff",
          "on-surface-variant": "#b9cacb",
          "outline-variant": "#3b494b",
          "tertiary": "#e9ffa8",
          "on-error": "#690005",
          "primary-fixed": "#7df4ff",
          "outline": "#849495",
          "surface-dim": "#121317",
          "on-error-container": "#ffdad6",
          "on-surface": "#e3e2e7",
          "glass-fill": "rgba(25, 26, 31, 0.6)",
          "on-tertiary-container": "#506600",
          "surface": "#121317",
          "primary-container": "#00f0ff",
          "on-secondary-container": "#fff6fc",
          "on-primary-fixed-variant": "#004f54",
          "on-primary-fixed": "#002022",
          "on-primary-container": "#006970",
          "surface-container-high": "#292a2e",
          "error-container": "#93000a",
          "surface-tint": "#00dbe9",
          "background": "#121317",
          "surface-charcoal": "#191A1F",
          "tertiary-container": "#bbea00"
        },
        "borderRadius": {
          "DEFAULT": "0.25rem",
          "lg": "0.5rem",
          "xl": "0.75rem",
          "full": "9999px"
        },
        "spacing": {
          "container-max": "1280px",
          "margin-desktop": "64px",
          "gutter": "24px",
          "base": "8px",
          "margin-mobile": "20px"
        },
        "fontFamily": {
          "display-lg":        ["Sora"],
          "price-display":     ["Sora"],
          "headline-lg":       ["Sora"],
          "body-md":           ["Inter"],
          "headline-md":       ["Sora"],
          "label-caps":        ["JetBrains Mono"],
          "headline-lg-mobile":["Sora"],
          "body-lg":           ["Inter"]
        }
      }
    }
  };
}

// ─── API Base URL ─────────────────────────────────────────────────────────────
const API_BASE = "/api";

// ─── CyberAPI — Lightweight fetch wrapper ─────────────────────────────────────
const CyberAPI = {
  _getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const userData = sessionStorage.getItem("cv_user");
    if (userData) {
      try {
        const u = JSON.parse(userData);
        if (u.token) {
          headers["Authorization"] = `Bearer ${u.token}`;
        }
      } catch (e) {}
    }
    return headers;
  },

  async get(endpoint, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${API_BASE}/${endpoint}${qs ? "?" + qs : ""}`;
    const res = await fetch(url, {
      headers: this._getHeaders()
    });
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    return res.json();
  },

  async post(endpoint, body = {}) {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: "POST",
      headers: this._getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST → ${res.status}`);
    return res.json();
  },

  async put(endpoint, id, body = {}) {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: "PUT",
      headers: this._getHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`PUT → ${res.status}`);
    return res.json();
  },

  async delete(endpoint, id) {
    const res = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: "DELETE",
      headers: this._getHeaders()
    });
    if (!res.ok) throw new Error(`DELETE → ${res.status}`);
    return res.json();
  }
};

// ─── Toast Notification System ────────────────────────────────────────────────
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement("div");
      this._container.id = "toast-container";
      this._container.style.cssText = [
        "position:fixed", "bottom:24px", "right:24px", "z-index:9999",
        "display:flex", "flex-direction:column", "gap:8px", "pointer-events:none"
      ].join(";");
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, type = "info", duration = 3500) {
    const colors = {
      success: { bg: "rgba(0,240,255,0.15)", border: "#00f0ff", icon: "✓" },
      error:   { bg: "rgba(255,180,171,0.15)", border: "#ffb4ab", icon: "✕" },
      warning: { bg: "rgba(233,255,168,0.15)", border: "#e9ffa8", icon: "!" },
      info:    { bg: "rgba(182,0,248,0.15)",   border: "#b600f8", icon: "i" }
    };
    const c = colors[type] || colors.info;
    const el = document.createElement("div");
    el.style.cssText = [
      `background:${c.bg}`,
      "backdrop-filter:blur(12px)",
      `border:1px solid ${c.border}`,
      `box-shadow:0 0 20px ${c.border}33`,
      "border-radius:10px",
      "padding:12px 18px",
      "display:flex", "align-items:center", "gap:10px",
      "font-family:JetBrains Mono,monospace",
      "font-size:12px",
      "color:#e3e2e7",
      "min-width:260px", "max-width:380px",
      "pointer-events:auto",
      "transition:all 0.3s ease",
      "opacity:0", "transform:translateY(8px)"
    ].join(";");
    el.innerHTML = `
      <span style="font-weight:bold;color:${c.border};font-size:14px">${c.icon}</span>
      <span style="flex:1">${message}</span>
      <span style="cursor:pointer;opacity:0.5" onclick="this.parentElement.remove()">×</span>
    `;
    this._getContainer().appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, "success"); },
  error(msg)   { this.show(msg, "error");   },
  warning(msg) { this.show(msg, "warning"); },
  info(msg)    { this.show(msg, "info");    }
};

// ─── Skeleton Loader Helper ───────────────────────────────────────────────────
function skeletonRow(cols = 7) {
  const cells = Array.from({ length: cols }, () =>
    `<td class="px-6 py-4"><div style="height:14px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.05) 25%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.05) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite"></div></td>`
  ).join("");
  return `<tr>${cells}</tr>`;
}

function showTableSkeleton(tbodyId, rows = 5, cols = 7) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = Array(rows).fill(skeletonRow(cols)).join("");
}

// Shimmer keyframes injected once
(function injectShimmer() {
  if (document.getElementById("shimmer-style")) return;
  const s = document.createElement("style");
  s.id = "shimmer-style";
  s.textContent = "@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}";
  document.head.appendChild(s);
})();

// ─── Shared Nav & Micro-interactions ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Highlight active sidebar link based on current URL
  const links       = document.querySelectorAll("aside a, nav a");
  const currentPath = window.location.pathname;

  links.forEach(link => {
    const href = link.getAttribute("href");
    if (href && href !== "#" && currentPath.endsWith(href)) {
      link.classList.remove("text-on-surface-variant", "opacity-70");
      link.classList.add("bg-secondary-container/20", "text-secondary-container", "border-r-2", "border-secondary-container");
    }
  });

  // Scale-down press feedback on buttons & links
  document.querySelectorAll("button, a").forEach(elem => {
    elem.addEventListener("mousedown",  () => elem.classList.add("scale-95"));
    elem.addEventListener("mouseup",    () => elem.classList.remove("scale-95"));
    elem.addEventListener("mouseleave", () => elem.classList.remove("scale-95"));
  });

  // Handle logout buttons globally
  const logoutButtons = document.querySelectorAll("button, a");
  logoutButtons.forEach(btn => {
    if (btn.textContent.trim().toLowerCase().includes("logout")) {
      btn.addEventListener("click", () => {
        sessionStorage.removeItem("cv_user");
        const path = window.location.pathname;
        window.location.href = path.includes("/admin/") ? "../index.html" : "index.html";
      });
    }
  });

  // Handle all placeholder '#' links globally
  document.querySelectorAll("a[href='#']").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      Toast.info("Module Offline / Coming Soon.");
    });
  });

  // API health check
fetch(`${API_BASE}/dashboard/summary`, { 
    method: "GET", 
    signal: AbortSignal.timeout(2000),
    credentials: "include"
})
.then(r => {
    if (r.ok) console.log("[Ulap Corner] API connected ✓");
})
.catch(() => {
    Toast.warning("Server offline - run: npm start");
});

  // ─── Transactions Drawer Injection ────────────────────────────────────────
  _injectTransactionsDrawer();
});

// ─── Transactions Drawer ───────────────────────────────────────────────────────
function _injectTransactionsDrawer() {
  const path = window.location.pathname;
  // Only inject on store-facing pages (not admin, not login/register pages)
  const isStorePage = path.includes("/store/shop") ||
                      path.includes("/store/checkout") ||
                      path.includes("/store/order-tracking") ||
                      path.includes("/store/homepage");
  if (!isStorePage) return;

  // ── 1. Inject drawer styles ──
  const style = document.createElement("style");
  style.id = "cv-tx-styles";
  style.textContent = `
    #cv-tx-backdrop {
      position: fixed; inset: 0; z-index: 1100;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(6px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    #cv-tx-backdrop.open { opacity: 1; pointer-events: auto; }

    #cv-tx-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: min(420px, 95vw);
      z-index: 1200;
      background: linear-gradient(160deg, rgba(13,13,18,0.97) 0%, rgba(18,15,28,0.97) 100%);
      border-left: 1px solid rgba(0,240,255,0.15);
      box-shadow: -8px 0 40px rgba(0,240,255,0.08), -2px 0 0 rgba(188,19,254,0.1);
      transform: translateX(100%);
      transition: transform 0.38s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    #cv-tx-drawer.open { transform: translateX(0); }

    #cv-tx-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(0,240,255,0.1);
      background: rgba(0,240,255,0.03);
      display: flex; align-items: center; justify-content: space-between;
      shrink: 0;
    }
    #cv-tx-header h2 {
      font-family: 'Sora', sans-serif;
      font-size: 12px; letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #00f0ff;
      text-shadow: 0 0 12px rgba(0,240,255,0.6);
    }
    #cv-tx-close {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #b9cacb; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      font-size: 18px; line-height: 1;
    }
    #cv-tx-close:hover { background: rgba(255,180,171,0.1); border-color: rgba(255,180,171,0.3); color: #ffb4ab; }

    #cv-tx-body {
      flex: 1; overflow-y: auto; padding: 20px 24px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,240,255,0.2) transparent;
    }
    #cv-tx-body::-webkit-scrollbar { width: 4px; }
    #cv-tx-body::-webkit-scrollbar-thumb { background: rgba(0,240,255,0.2); border-radius: 4px; }

    .cv-tx-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 16px;
      margin-bottom: 12px;
      transition: all 0.2s ease;
      cursor: pointer; text-decoration: none; display: block;
    }
    .cv-tx-card:hover {
      border-color: rgba(0,240,255,0.3);
      background: rgba(0,240,255,0.04);
      box-shadow: 0 0 20px rgba(0,240,255,0.08);
      transform: translateY(-1px);
    }
    .cv-tx-order-id {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; color: #00f0ff;
      letter-spacing: 0.08em;
    }
    .cv-tx-date {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px; color: rgba(185,202,203,0.6);
    }
    .cv-tx-status {
      display: inline-flex; align-items: center; gap: 5px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 3px 8px; border-radius: 20px;
      border: 1px solid; font-weight: 600;
    }
    .cv-tx-status.pending   { color: #e9ffa8; border-color: rgba(233,255,168,0.4); background: rgba(233,255,168,0.08); }
    .cv-tx-status.confirmed { color: #00f0ff; border-color: rgba(0,240,255,0.4);   background: rgba(0,240,255,0.08); }
    .cv-tx-status.shipped   { color: #ebb2ff; border-color: rgba(235,178,255,0.4); background: rgba(235,178,255,0.08); }
    .cv-tx-status.delivered { color: #abd600; border-color: rgba(171,214,0,0.4);   background: rgba(171,214,0,0.08); }
    .cv-tx-status.cancelled { color: #ffb4ab; border-color: rgba(255,180,171,0.4); background: rgba(255,180,171,0.08); }
    .cv-tx-status.unknown   { color: #849495; border-color: rgba(132,148,149,0.3); background: rgba(132,148,149,0.05); }

    .cv-tx-total {
      font-family: 'Sora', sans-serif;
      font-size: 16px; font-weight: 700;
      color: #e3e2e7;
    }
    .cv-tx-method {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px; color: rgba(185,202,203,0.5);
      text-transform: uppercase; letter-spacing: 0.1em;
    }
    .cv-tx-track-link {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px; color: #00f0ff;
      text-transform: uppercase; letter-spacing: 0.1em;
      opacity: 0.7;
      display: flex; align-items: center; gap: 3px;
    }
    .cv-tx-empty {
      text-align: center; padding: 60px 20px;
    }
    .cv-tx-empty-icon {
      font-size: 48px; opacity: 0.2; display: block; margin-bottom: 16px;
    }
    .cv-tx-empty h3 {
      font-family: 'Sora', sans-serif;
      font-size: 13px; text-transform: uppercase;
      letter-spacing: 0.15em; color: #849495;
      margin-bottom: 8px;
    }
    .cv-tx-empty p {
      font-family: 'Inter', sans-serif;
      font-size: 12px; color: rgba(185,202,203,0.4);
      line-height: 1.6;
    }
    .cv-tx-skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }
    #cv-tx-footer {
      padding: 16px 24px;
      border-top: 1px solid rgba(0,240,255,0.08);
      background: rgba(0,240,255,0.02);
    }
    #cv-tx-shop-btn {
      display: block; width: 100%; padding: 12px;
      background: linear-gradient(135deg, rgba(0,240,255,0.08), rgba(188,19,254,0.08));
      border: 1px solid rgba(0,240,255,0.2);
      border-radius: 10px; text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px; letter-spacing: 0.15em;
      text-transform: uppercase; color: #00f0ff;
      cursor: pointer; text-decoration: none;
      transition: all 0.2s ease;
    }
    #cv-tx-shop-btn:hover {
      background: linear-gradient(135deg, rgba(0,240,255,0.15), rgba(188,19,254,0.12));
      border-color: rgba(0,240,255,0.4);
      box-shadow: 0 0 20px rgba(0,240,255,0.1);
    }
    #cv-tx-nav-btn {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #b9cacb;
      background: rgba(0,240,255,0.05);
      border: 1px solid rgba(0,240,255,0.15);
      border-radius: 8px;
      padding: 6px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex; align-items: center; gap: 6px;
      white-space: nowrap;
    }
    #cv-tx-nav-btn:hover {
      background: rgba(0,240,255,0.12);
      border-color: rgba(0,240,255,0.4);
      color: #00f0ff;
      box-shadow: 0 0 15px rgba(0,240,255,0.1);
    }
    #cv-tx-nav-btn .cv-tx-badge {
      background: #00f0ff;
      color: #000;
      border-radius: 10px;
      font-size: 8px; font-weight: 700;
      padding: 1px 5px; min-width: 16px;
      text-align: center;
      display: none;
    }
    #cv-tx-nav-btn .cv-tx-badge.visible { display: inline-block; }
  `;
  document.head.appendChild(style);

  // ── 2. Build drawer HTML ──
  const backdrop = document.createElement("div");
  backdrop.id = "cv-tx-backdrop";
  backdrop.onclick = closeTransactionsDrawer;
  document.body.appendChild(backdrop);

  const drawer = document.createElement("div");
  drawer.id = "cv-tx-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-label", "My Orders & Transactions");
  drawer.innerHTML = `
    <div id="cv-tx-header">
      <div>
        <h2>⚡ MY ORDERS &amp; TRANSACTIONS</h2>
        <p style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(185,202,203,0.5);margin-top:3px;letter-spacing:0.1em;">ORDER HISTORY &amp; TRACKING</p>
      </div>
      <button id="cv-tx-close" onclick="closeTransactionsDrawer()" title="Close">×</button>
    </div>
    <div id="cv-tx-body">
      <div class="cv-tx-empty" id="cv-tx-loading" style="display:none">
        <span class="cv-tx-empty-icon">⟳</span>
        <h3>Loading Orders...</h3>
        <p>Fetching your transaction records from the server.</p>
      </div>
      <div id="cv-tx-list"></div>
    </div>
    <div id="cv-tx-footer">
      <a id="cv-tx-shop-btn" href="/store/shop.html">↗ CONTINUE SHOPPING</a>
    </div>
  `;
  document.body.appendChild(drawer);

  // ── 3. Inject "MY ORDERS" button into the nav bar ──
  // Try shop.html nav first, then checkout.html nav
  const shopNav = document.getElementById("shop-nav");
  const checkoutNavs = document.querySelectorAll("header nav");
  const targetNav = shopNav || (checkoutNavs.length ? checkoutNavs[0] : null);

  if (targetNav) {
    const navBtn = document.createElement("button");
    navBtn.id = "cv-tx-nav-btn";
    navBtn.title = "View My Orders & Transactions";
    navBtn.onclick = openTransactionsDrawer;

    // Count existing orders for the badge
    let orderCount = 0;
    try {
      const h = JSON.parse(localStorage.getItem("cv_order_history") || "[]");
      orderCount = h.length;
    } catch(e) {}

    navBtn.innerHTML = `
      <span style="font-size:13px">📦</span>
      MY ORDERS
      <span class="cv-tx-badge${orderCount > 0 ? ' visible' : ''}" id="cv-tx-count-badge">${orderCount > 9 ? '9+' : orderCount}</span>
    `;
    targetNav.appendChild(navBtn);
  }

  // ── 4. Also inject a floating pill button as fallback for mobile / pages without nav ──
  const floatBtn = document.createElement("button");
  floatBtn.id = "cv-tx-float-btn";
  floatBtn.onclick = openTransactionsDrawer;
  floatBtn.title = "View My Orders";
  floatBtn.style.cssText = [
    "position:fixed","bottom:90px","right:20px","z-index:900",
    "background:linear-gradient(135deg,rgba(0,240,255,0.12),rgba(188,19,254,0.12))",
    "border:1px solid rgba(0,240,255,0.3)",
    "border-radius:50px","padding:10px 18px",
    "font-family:'JetBrains Mono',monospace",
    "font-size:10px","letter-spacing:0.12em","text-transform:uppercase",
    "color:#00f0ff","cursor:pointer",
    "display:flex","align-items:center","gap:8px",
    "box-shadow:0 0 20px rgba(0,240,255,0.12)",
    "backdrop-filter:blur(12px)",
    "transition:all 0.25s ease"
  ].join(";");
  floatBtn.innerHTML = `<span style="font-size:14px">📦</span> MY ORDERS`;
  floatBtn.onmouseenter = () => {
    floatBtn.style.boxShadow = "0 0 30px rgba(0,240,255,0.3)";
    floatBtn.style.borderColor = "rgba(0,240,255,0.6)";
  };
  floatBtn.onmouseleave = () => {
    floatBtn.style.boxShadow = "0 0 20px rgba(0,240,255,0.12)";
    floatBtn.style.borderColor = "rgba(0,240,255,0.3)";
  };
  document.body.appendChild(floatBtn);
}

function openTransactionsDrawer() {
  const drawer   = document.getElementById("cv-tx-drawer");
  const backdrop = document.getElementById("cv-tx-backdrop");
  if (!drawer || !backdrop) return;
  drawer.classList.add("open");
  backdrop.classList.add("open");
  document.body.style.overflow = "hidden";
  _renderTransactions();
}

function closeTransactionsDrawer() {
  const drawer   = document.getElementById("cv-tx-drawer");
  const backdrop = document.getElementById("cv-tx-backdrop");
  if (!drawer || !backdrop) return;
  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  document.body.style.overflow = "";
}

async function _renderTransactions() {
  const list = document.getElementById("cv-tx-list");
  if (!list) return;

  // Show skeleton while loading
  list.innerHTML = Array(3).fill(0).map(() => `
    <div style="margin-bottom:12px;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)">
      <div class="cv-tx-skeleton" style="height:12px;width:60%;margin-bottom:10px"></div>
      <div class="cv-tx-skeleton" style="height:10px;width:40%;margin-bottom:12px"></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="cv-tx-skeleton" style="height:20px;width:80px;border-radius:20px"></div>
        <div class="cv-tx-skeleton" style="height:18px;width:70px"></div>
      </div>
    </div>
  `).join("");

  // Retrieve order IDs from localStorage
  let orderIds = [];
  try {
    orderIds = JSON.parse(localStorage.getItem("cv_order_history") || "[]");
  } catch(e) {}

  if (!orderIds.length) {
    list.innerHTML = `
      <div class="cv-tx-empty">
        <span class="cv-tx-empty-icon">📦</span>
        <h3>No Orders Yet</h3>
        <p>Your completed orders will appear here. Start shopping to place your first order!</p>
        <a href="/store/shop.html" style="display:inline-block;margin-top:20px;padding:10px 24px;background:rgba(0,240,255,0.08);border:1px solid rgba(0,240,255,0.25);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#00f0ff;text-decoration:none;">Browse Store</a>
      </div>
    `;
    return;
  }

  // Fetch all orders concurrently
  const results = await Promise.allSettled(
    orderIds.map(id =>
      fetch(`/api/orders/${id}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => ({ id, data }))
        .catch(() => ({ id, data: null }))
    )
  );

  const statusConfig = {
    pending:   { label: "PENDING",   cls: "pending",   icon: "⏳" },
    confirmed: { label: "CONFIRMED", cls: "confirmed", icon: "✓"  },
    shipped:   { label: "SHIPPED",   cls: "shipped",   icon: "🚚" },
    delivered: { label: "DELIVERED", cls: "delivered", icon: "✅" },
    cancelled: { label: "CANCELLED", cls: "cancelled", icon: "✕"  },
  };

  list.innerHTML = results.map(r => {
    const { id, data } = r.value || { id: r.reason, data: null };

    if (!data) {
      return `
        <a class="cv-tx-card" href="/store/order-tracking.html?order_id=${id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div>
              <div class="cv-tx-order-id">#${id}</div>
              <div class="cv-tx-date" style="margin-top:3px">Unable to fetch details</div>
            </div>
            <span class="cv-tx-status unknown">UNKNOWN</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="cv-tx-method">— —</span>
            <span class="cv-tx-track-link">TRACK ↗</span>
          </div>
        </a>
      `;
    }

    const order = data.order || data;
    const rawStatus = String(order.status || "pending").toLowerCase();
    const sc = statusConfig[rawStatus] || { label: rawStatus.toUpperCase(), cls: "unknown", icon: "●" };

    // Format date
    let dateStr = "—";
    const rawDate = order.created_at || order.createdAt || order.date;
    if (rawDate) {
      try {
        dateStr = new Date(rawDate).toLocaleString("en-PH", {
          year: "numeric", month: "short", day: "2-digit",
          hour: "2-digit", minute: "2-digit"
        });
      } catch(e) {}
    }

    const total = order.total_amount || order.totalAmount || order.total || 0;
    const method = order.payment_method || order.paymentMethod || "—";
    const name = order.full_name || order.billing_name || order.name || "—";

    return `
      <a class="cv-tx-card" href="/store/order-tracking.html?order_id=${id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div class="cv-tx-order-id">#${id}</div>
            <div class="cv-tx-date" style="margin-top:2px">${dateStr}</div>
            <div style="font-family:'Inter',sans-serif;font-size:10px;color:rgba(185,202,203,0.5);margin-top:3px">${name}</div>
          </div>
          <span class="cv-tx-status ${sc.cls}">${sc.icon} ${sc.label}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05)">
          <div>
            <div class="cv-tx-total">₱${Number(total).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div class="cv-tx-method" style="margin-top:2px">${method}</div>
          </div>
          <span class="cv-tx-track-link">
            <span style="font-size:13px">📍</span> TRACK ORDER ↗
          </span>
        </div>
      </a>
    `;
  }).join("");
}

