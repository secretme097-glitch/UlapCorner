const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Public route to fetch all site settings
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT setting_key, setting_value FROM site_settings');
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// Protected route to update site settings
// We allow super_admin and staff to update homepage settings
router.post('/', authenticate, requireRole(['super_admin', 'staff', 'Super Admin', 'Admin', 'Staff']), async (req, res) => {
  try {
    const db = await getDb();
    const settings = req.body;
    
    // We expect a JSON body with key-value pairs
    for (const [key, value] of Object.entries(settings)) {
      await db.run(
        'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value',
        [key, value]
      );
    }
    
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

module.exports = router;
