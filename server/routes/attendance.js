const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// POST ROUTE - Para sa Time In at Time Out ng Staff
router.post('/log', async (req, res) => {
    try {
        const { staff_name, type } = req.body; // type is "Time In" or "Time Out"

        if (!staff_name || !type) {
            return res.status(400).json({ success: false, error: 'Kailangan ang pangalan at uri ng attendance.' });
        }

        const db = await getDb();
        const today = new Date().toISOString().split('T')[0];
        
        // Get local time in HH:mm:ss format
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0];

        if (type === 'Time In') {
            const existing = await db.get('SELECT id FROM attendance_logs WHERE date = ? AND staff_name = ? AND clock_in IS NOT NULL AND clock_out IS NULL', [today, staff_name]);
            if (existing) {
                return res.status(400).json({ success: false, error: 'Naka-Time In ka na ngayon.' });
            }
            
            await db.run(
                'INSERT INTO attendance_logs (date, staff_name, branch, clock_in, status) VALUES (?, ?, ?, ?, ?)',
                [today, staff_name, 'Main Branch', currentTime, 'Active']
            );
        } else if (type === 'Time Out') {
            const existing = await db.get('SELECT id, clock_in FROM attendance_logs WHERE date = ? AND staff_name = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1', [today, staff_name]);
            
            if (!existing) {
                return res.status(400).json({ success: false, error: 'Wala kang active na Time In.' });
            }
            
            // simple calculation
            await db.run(
                'UPDATE attendance_logs SET clock_out = ?, status = ? WHERE id = ?',
                [currentTime, 'Completed', existing.id]
            );
        }

        return res.json({ 
            success: true, 
            message: `Matagumpay na na-record ang ${type} para kay ${staff_name}!` 
        });
    } catch (error) {
        console.error("Attendance log error:", error);
        return res.status(500).json({ success: false, error: 'Internal server error sa attendance.' });
    }
});

// GET ROUTE - Para makita ang logs (Opsyonal para sa Admin)
router.get('/logs', async (req, res) => {
    try {
        const db = await getDb();
        const logs = await db.all('SELECT * FROM attendance_logs ORDER BY timestamp DESC');
        return res.json(logs);
    } catch (error) {
        console.error("Error fetching attendance logs:", error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;