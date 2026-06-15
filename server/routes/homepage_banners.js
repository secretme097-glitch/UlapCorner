const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const bannerUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../../assets/banners'));
    },
    filename: function (req, file, cb) {
      cb(null, 'banner_' + Date.now() + path.extname(file.originalname));
    }
  })
});

// GET banners
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const banners = await db.all('SELECT * FROM homepage_banners ORDER BY sort_order ASC, id ASC');
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new banner
router.post('/', authenticate, requireRole(['Super Admin', 'Admin', 'Staff']), bannerUpload.single('banner_image'), async (req, res) => {
  const { title_overlay_text, sort_order } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Image file is required' });
  
  const image_url = '../assets/banners/' + req.file.filename;
  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO homepage_banners (image_url, sort_order, title_overlay_text) VALUES (?, ?, ?)',
      [image_url, sort_order || 0, title_overlay_text || '']
    );
    res.json({ id: result.lastID, image_url, sort_order, title_overlay_text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update banner order
router.put('/:id/order', authenticate, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
  const { sort_order } = req.body;
  try {
    const db = await getDb();
    await db.run('UPDATE homepage_banners SET sort_order = ? WHERE id = ?', [sort_order, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE banner
router.delete('/:id', authenticate, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM homepage_banners WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
