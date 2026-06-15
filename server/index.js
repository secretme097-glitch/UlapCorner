require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db'); // I-require ang database initialization handler

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const userRoutes = require('./routes/users');
// 🛠️ INAYOS: Ibinalik at kinonekta natin ang payments route file mo!
const paymentsRoutes = require('./routes/payments');
const settingsRoutes = require('./routes/settings');
const categoriesRoutes = require('./routes/categories');
const bannersRoutes = require('./routes/homepage_banners');

const app = express();
const PORT = process.env.PORT || 8000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

//attendance
app.use('/api/attendance', require('./routes/attendance'));

// Serve client-facing storefront source files first so /store/ uses the latest source versions.
app.use('/store', express.static(path.join(__dirname, '../store')));

// Serve the built frontend from /dist (primary)
app.use(express.static(path.join(__dirname, '../dist')));

// Serve admin panel pages and shared assets (not in dist/)
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
// 🛠️ INAYOS: Inirehistro ang /api/payments para gumana ang fetch sa checkout.html!
app.use('/api/payments', paymentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/homepage/banners', bannersRoutes);

// Convenience aliases so login/register work at both /api/auth/* and /api/*
app.use('/api/login', (req, res, next) => { req.url = '/login'; authRoutes(req, res, next); });
app.use('/api/register', (req, res, next) => { req.url = '/register'; authRoutes(req, res, next); });

// Dashboard summary alias (used by shared.js health-check)
app.get('/api/dashboard/summary', (req, res, next) => {
  req.url = '/dashboard/summary';
  adminRoutes(req, res, next);
});

// ── Hero Image Upload ────────────────────────────────────────────────────────
const multer = require('multer');
const heroUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../assets'));
    },
    filename: function (req, file, cb) {
      const type = req.query.type;
      if (type === 'bg') {
        cb(null, 'hero_bg.png');
      } else {
        cb(null, 'hero_product.png');
      }
    }
  })
});

app.post('/api/upload-hero', heroUpload.single('hero_image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image provided.' });
  }
  res.json({ success: true, message: 'Image updated successfully!' });
});

// ── Public storefront root ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../store/homepage.html'));
});

// ── SPA catch-all — serve index.html for any unmatched GET ───────────────────
app.get('*', (req, res) => {
  // Naglagay tayo ng mabilisang fallback check para kung wala pang /dist/index.html, 
  // hindi magka-error ang browser at itatapon ka muna nito sa storefront homepage.
  const spaPath = path.join(__dirname, '../dist/index.html');
  const fs = require('fs');
  if (fs.existsSync(spaPath)) {
    res.sendFile(spaPath);
  } else {
    res.sendFile(path.join(__dirname, '../store/homepage.html'));
  }
});

// ── Safe Database Connection & Server Boot ────────────────────────────────────
async function startServer() {
  try {
    console.log('[Ulap Corner] Connecting to SQLite database...');
    // Siguraduhing gawa at seeded ang database bago buksan ang network port
    await getDb();

    app.listen(PORT, () => {
      console.log(`\n🚀 ===================================================`);
      console.log(`[Ulap Corner] Server running at http://localhost:${PORT}`);
      console.log(`[Ulap Corner] Storefront available at http://localhost:${PORT}/store/shop.html`);
      console.log(`[Ulap Corner] Administrative Core successfully bound.`);
      console.log(`=======================================================\n`);
    });
  } catch (error) {
    console.error('[Ulap Corner] Failed to initialize database on startup:', error);
    process.exit(1); // Patayin ang node process kapag may fatal error sa DB connection
  }
}

// Patakbuhin ang startup handler
startServer();