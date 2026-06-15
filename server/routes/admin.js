const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// In-memory cache logic (simplified for the refactor)
let cache = new Map();
function getCache(key) { return cache.has(key) ? cache.get(key) : null; }
function setCache(key, value, ttlSec = 60) {
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttlSec * 1000);
}

const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Set up Nodemailer transporter using dynamic environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE !== 'false', // default true (for SSL port 465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

router.get('/users/verify/:token', async (req, res) => {
  try {
    const db = await getDb();
    const { token } = req.params;

    const user = await db.get("SELECT id FROM users WHERE otp_code = ?", [token]);

    if (!user) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    // Update user to be verified and remove the token
    await db.run("UPDATE users SET is_verified = 1, otp_code = NULL WHERE id = ?", [user.id]);

    // Redirect to login page
    res.redirect('/store/login.html?verified=true');
  } catch (err) {
    console.error("Error verifying user:", err);
    res.status(500).send("Server error during verification.");
  }
});

router.get('/users', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const db = await getDb();
    // Fetch all users (staff and customers)
    const users = await db.all("SELECT id, full_name, email, role, status, is_verified FROM users WHERE role != 'super_admin' ORDER BY created_at DESC");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users list:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/staff', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const db = await getDb();
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await db.get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // We create the account with is_verified = 0 so they must verify first.
    await db.run(
      "INSERT INTO users (full_name, email, password, role, status, is_verified, otp_code) VALUES (?, ?, ?, 'staff', 'Active', 0, ?)",
      [full_name, email.toLowerCase(), hashedPassword, verificationToken]
    );

    const verificationUrl = `http://localhost:8000/api/admin/users/verify/${verificationToken}`;
    console.log(`\n✉️ [SMTP-DEBUG] Verification Link created for ${email}: \n👉 ${verificationUrl}\n`);

    // Send the email
    const path = require('path');
    const mailOptions = {
      from: `"Ulap Corner" <${process.env.SMTP_USER || 'no-reply@cybervape.com'}>`,
      to: email,
      subject: 'Verify Your Email - Ulap Corner',
      html: `
        <div style="background: linear-gradient(180deg, #06070f 0%, #090b12 100%); padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e3e2e7; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #070a12; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 20px; padding: 40px 30px; box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);">
            <div style="margin-bottom: 24px;">
              <img src="cid:ulapcorner_logo" alt="Ulap Corner Logo" style="height: 60px; width: auto; border-radius: 8px; box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);" />
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px;">Verify Your Email</h1>
            <p style="color: #00f0ff; font-size: 16px; font-weight: bold; margin: 0 0 16px 0; letter-spacing: 1px;">Hello, ${full_name}</p>
            <p style="color: #a5a5b5; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              Welcome to the Ulap Corner team. Keep your staff account secure by verifying your email address. 
              Use the credentials below to log in after verification:
            </p>
            <div style="background-color: rgba(15, 18, 32, 0.8); border: 1px solid rgba(188, 19, 254, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 28px; text-align: left;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #a5a5b5;"><strong>Email:</strong> <span style="color: #00f0ff; font-weight: 600;">${email}</span></p>
              <p style="margin: 0; font-size: 13px; color: #a5a5b5;"><strong>Password:</strong> <span style="color: #bc13fe; font-weight: 600;">${password}</span></p>
            </div>
            <a href="${verificationUrl}" style="background-color: #00f0ff; color: #00181a; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 0 15px rgba(0, 240, 255, 0.3); transition: all 0.2s;">Verify Email</a>
            <div style="margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: left;">
              <p style="color: #5d5d70; font-size: 11px; line-height: 1.5; margin: 0;">
                If this request was not made by you, please contact the system administrator immediately.
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [{
        filename: 'ulapcorner_logo.jpg',
        path: path.join(__dirname, '../../assets/ulapcorner_logo.jpg'),
        cid: 'ulapcorner_logo'
      }]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    res.status(201).json({ message: 'Staff account created. Verification email sent.' });
  } catch (err) {
    console.error("Error creating staff account:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const db = await getDb();
    const targetUserId = req.params.id;

    if (parseInt(targetUserId) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const user = await db.get("SELECT id FROM users WHERE id = ?", [targetUserId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.run("DELETE FROM users WHERE id = ?", [targetUserId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/send-reset/:id', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const db = await getDb();
    const targetUserId = req.params.id;

    const user = await db.get("SELECT id, full_name, email FROM users WHERE id = ?", [targetUserId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await db.run("UPDATE users SET otp_code = ? WHERE id = ?", [resetToken, targetUserId]);

    const resetUrl = `http://localhost:8000/store/reset-password.html?token=${resetToken}`;
    console.log(`\n✉️ [SMTP-DEBUG] Password Reset Link created for ${user.email}: \n👉 ${resetUrl}\n`);

    const path = require('path');
    const mailOptions = {
      from: `"Ulap Corner" <${process.env.SMTP_USER || 'no-reply@cybervape.com'}>`,
      to: user.email,
      subject: 'Reset Your Password - Ulap Corner',
      html: `
        <div style="background: linear-gradient(180deg, #06070f 0%, #090b12 100%); padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e3e2e7; text-align: center;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #070a12; border: 1px solid rgba(188, 19, 254, 0.2); border-radius: 20px; padding: 40px 30px; box-shadow: 0 0 20px rgba(188, 19, 254, 0.1);">
            <div style="margin-bottom: 24px;">
              <img src="cid:ulapcorner_logo" alt="Ulap Corner Logo" style="height: 60px; width: auto; border-radius: 8px; box-shadow: 0 0 15px rgba(188, 19, 254, 0.4);" />
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 2px;">Reset Password</h1>
            <p style="color: #bc13fe; font-size: 16px; font-weight: bold; margin: 0 0 16px 0; letter-spacing: 1px;">Hello, ${user.full_name}</p>
            <p style="color: #a5a5b5; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              An administrator has initiated a password reset for your account. Please click the button below to secure your account and set a new password.
            </p>
            <a href="${resetUrl}" style="background-color: #bc13fe; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 0 15px rgba(188, 19, 254, 0.3); transition: all 0.2s;">Reset Password</a>
            <div style="margin-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px; text-align: left;">
              <p style="color: #5d5d70; font-size: 11px; line-height: 1.5; margin: 0;">
                If you did not request this, you can safely ignore this email.
              </p>
            </div>
          </div>
        </div>
      `,
      attachments: [{
        filename: 'ulapcorner_logo.jpg',
        path: path.join(__dirname, '../../assets/ulapcorner_logo.jpg'),
        cid: 'ulapcorner_logo'
      }]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending reset email:", error);
      } else {
        console.log('Reset email sent: ' + info.response);
      }
    });

    res.json({ message: 'Password reset email sent successfully' });
  } catch (err) {
    console.error("Error sending reset email:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Orders Management ────────────────────────────────────────────────────────
router.get('/orders', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  try {
    const orders = await db.all(`
      SELECT o.*, 
        (SELECT status FROM transaction_ledger WHERE order_id = o.id ORDER BY id DESC LIMIT 1) AS latest_status
      FROM orders o
      ORDER BY o.created_at DESC
    `);
    // Parse JSON items string
    for (const order of orders) {
      try { order.items = JSON.parse(order.items || '[]'); } catch(e) { order.items = []; }
    }
    res.json({ orders });
  } catch (err) {
    console.error('[Admin Orders GET]', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

router.patch('/orders/:order_id/status', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const { order_id } = req.params;
  const { status, description } = req.body;

  if (!status) return res.status(400).json({ error: 'Status is required.' });

  const validStatuses = ['PENDING', 'PENDING_PAYMENT', 'PAYMENT_SUCCESSFUL', 'CONFIRMED', 'COD', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'PAYMENT_FAILED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', order_id);
    if (!order) return res.status(404).json({ error: `Order ${order_id} not found.` });

    // Update the order's payment_status column
    await db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [status, order_id]);

    // Log the status change in the ledger
    const desc = description || `Status manually updated to ${status} by admin.`;
    await db.run(
      `INSERT INTO transaction_ledger (order_id, status, description) VALUES (?, ?, ?)`,
      order_id, status, desc
    );

    res.json({ success: true, order_id, status, message: `Order ${order_id} updated to ${status}` });
  } catch (err) {
    console.error('[Admin Orders PATCH]', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

router.delete('/orders/:order_id', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const { order_id } = req.params;
  try {
    await db.run('DELETE FROM transaction_ledger WHERE order_id = ?', order_id);
    await db.run('DELETE FROM orders WHERE id = ?', order_id);
    res.json({ success: true, message: `Order ${order_id} deleted.` });
  } catch (err) {
    console.error('[Admin Orders DELETE]', err);
    res.status(500).json({ error: 'Failed to delete order.' });
  }
});

router.get('/inventory', authenticate, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
  const db = await getDb();
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const status = req.query.status;
  const q = req.query.q;
  const params = [];
  let where = '';
  if (status && status !== 'all') { where += (where ? ' AND ' : '') + 'status = ?'; params.push(status); }
  if (q) {
    where += (where ? ' AND ' : '') + '(item_name LIKE ? OR sku LIKE ? OR staff_name LIKE ?)';
    const like = `%${q}%`; params.push(like, like, like);
  }
  const clause = where ? `WHERE ${where}` : '';
  const rows = await db.all(`SELECT * FROM inventory_logs ${clause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`, ...params, limit, offset);
  const totalRow = await db.get(`SELECT COUNT(*) as cnt FROM inventory_logs ${clause}`, ...params);
  const total = totalRow.cnt;
  const discrepancies = await db.get(`SELECT COUNT(*) as cnt FROM inventory_logs WHERE status='Pending'`).then(r => r.cnt);
  const audited24h = await db.get(`SELECT COUNT(*) as cnt FROM inventory_logs WHERE timestamp >= datetime('now','-1 day','localtime')`).then(r => r.cnt);
  const valueAdj = await db.get(`SELECT SUM(new_qty - prev_qty) as sum FROM inventory_logs WHERE action_type LIKE '%Damaged%'`).then(r => r.sum || 0);
  res.json({ rows, total, stats: { discrepancies, audited_24h: audited24h, value_adjustment: valueAdj } });
});

router.post('/inventory', authenticate, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
  const db = await getDb();
  const { staff_name, sku, item_name, action_type, prev_qty, new_qty, status } = req.body;

  try {
    // 1. Save the audit log entry
    const result = await db.run(
      `INSERT INTO inventory_logs (staff_name, item_name, sku, action_type, prev_qty, new_qty, status) VALUES (?,?,?,?,?,?,?)`,
      staff_name, item_name, sku, action_type, parseInt(prev_qty), parseInt(new_qty), status || 'Pending'
    );
    const row = await db.get('SELECT * FROM inventory_logs WHERE id = ?', result.lastID);
    cache.delete('inventory_all');

    // 2. If it's a restock or stock adjustment, update the matching product's stock
    const syncActions = ['Manual Restock', 'Stock Count Adjustment', 'API Sync Adjustment'];
    if (syncActions.includes(action_type) && item_name) {
      // Try to find product by name (case-insensitive partial match)
      const product = await db.get(
        "SELECT id FROM products WHERE LOWER(name) = LOWER(?) OR LOWER(name) LIKE LOWER(?)",
        [item_name.trim(), `%${item_name.trim()}%`]
      );
      if (product) {
        await db.run('UPDATE products SET stock = ? WHERE id = ?', [parseInt(new_qty), product.id]);
        console.log(`[Inventory Sync] Updated product ID ${product.id} stock to ${new_qty} from audit log by ${staff_name}`);
      } else {
        console.log(`[Inventory Sync] No matching product found for item: "${item_name}". Audit log saved only.`);
      }
    }

    res.status(201).json(row);
  } catch (err) {
    console.error('[Inventory POST Error]', err);
    res.status(500).json({ error: err.message });
  }
});


router.put('/inventory/:id', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const data = req.body;
  await db.run(
    `UPDATE inventory_logs SET staff_name=?, item_name=?, sku=?, action_type=?, prev_qty=?, new_qty=?, status=? WHERE id=?`,
    data.staff_name, data.item_name, data.sku, data.action_type, data.prev_qty, data.new_qty, data.status, id
  );
  const row = await db.get('SELECT * FROM inventory_logs WHERE id = ?', id);
  cache.delete('inventory_all');
  res.json(row);
});

router.get('/attendance', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const rows = await db.all('SELECT * FROM attendance_logs WHERE date = ? ORDER BY clock_in', date);
  const onDuty = await db.get("SELECT COUNT(*) as cnt FROM attendance_logs WHERE date=? AND status IN ('Active','On Break')", date).then(r => r.cnt);
  const total = await db.get('SELECT COUNT(*) as cnt FROM attendance_logs WHERE date=?', date).then(r => r.cnt);
  const late = await db.get("SELECT COUNT(*) as cnt FROM attendance_logs WHERE date=? AND status='Late'", date).then(r => r.cnt);
  const manHours = await db.get('SELECT SUM(total_hours) as sum FROM attendance_logs WHERE date=?', date).then(r => r.sum || 0);
  res.json({ rows, date, stats: { on_duty: onDuty, total_staff: total, late, total_man_hours: Math.round(manHours * 10) / 10 } });
});

router.post('/attendance', authenticate, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const { staff_name, branch, clock_in, clock_out, total_hours, status, notes } = req.body;
  const result = await db.run(
    `INSERT INTO attendance_logs (date, staff_name, branch, clock_in, clock_out, total_hours, status, notes) VALUES (?,?,?,?,?,?,?,?)`,
    today, staff_name, branch || 'Main Branch', clock_in, clock_out, total_hours || 0, status || 'Active', notes || ''
  );
  const row = await db.get('SELECT * FROM attendance_logs WHERE id = ?', result.lastID);
  cache.delete('attendance_all');
  res.status(201).json(row);
});

router.get('/payroll', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const period = req.query.period;
  const where = period ? 'WHERE period = ?' : '';
  const args = period ? [period] : [];
  const rows = await db.all(`SELECT * FROM payroll_records ${where} ORDER BY staff_name`, ...args);
  const totals = await db.get(`SELECT SUM(final_net) as net, SUM(commission) as comm, SUM(deductions) as deduct FROM payroll_records ${where}`, ...args);
  const periods = await db.all('SELECT DISTINCT period FROM payroll_records ORDER BY period DESC');
  res.json({ rows, stats: { total_net: Math.round((totals?.net || 0) * 100) / 100, total_commission: Math.round((totals?.comm || 0) * 100) / 100, total_deductions: Math.round((totals?.deduct || 0) * 100) / 100 }, periods: periods.map(r => r.period) });
});

router.post('/payroll', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const { period, staff_name, role, base_salary, commission, ot_bonus, deductions, pay_status } = req.body;
  const result = await db.run(
    `INSERT INTO payroll_records (period, staff_name, role, base_salary, commission, ot_bonus, deductions, pay_status) VALUES (?,?,?,?,?,?,?,?)`,
    period, staff_name, role || 'Staff', base_salary || 0, commission || 0, ot_bonus || 0, deductions || 0, pay_status || 'Pending'
  );
  const row = await db.get('SELECT * FROM payroll_records WHERE id = ?', result.lastID);
  cache.delete('payroll_all');
  res.status(201).json(row);
});

router.patch('/payroll/:id/status', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const { pay_status } = req.body;
  if (!pay_status) return res.status(400).json({ error: 'Status is required' });
  
  try {
    await db.run('UPDATE payroll_records SET pay_status = ? WHERE id = ?', [pay_status, id]);
    cache.delete('payroll_all');
    res.json({ success: true, id, pay_status });
  } catch (err) {
    console.error('Payroll status update error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/shifts', authenticate, requireRole(['Super Admin', 'Admin', 'Staff']), async (req, res) => {
  const db = await getDb();
  const week = req.query.week;
  const where = week ? 'WHERE week_start = ?' : '';
  const args = week ? [week] : [];
  const rows = await db.all(`SELECT * FROM shift_schedules ${where} ORDER BY staff_name`, ...args);
  const weeks = await db.all('SELECT DISTINCT week_start FROM shift_schedules ORDER BY week_start DESC');
  res.json({ rows, weeks: weeks.map(r => r.week_start) });
});

router.post('/shifts', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const { week_start, staff_name, role, monday, tuesday, wednesday, thursday, friday, saturday, sunday } = req.body;
  const result = await db.run(
    `INSERT INTO shift_schedules (week_start, staff_name, role, monday, tuesday, wednesday, thursday, friday, saturday, sunday) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    week_start, staff_name, role || 'Staff', monday || 'OFF', tuesday || 'OFF', wednesday || 'OFF', thursday || 'OFF', friday || 'OFF', saturday || 'OFF', sunday || 'OFF'
  );
  const row = await db.get('SELECT * FROM shift_schedules WHERE id = ?', result.lastID);
  cache.delete('shifts_all');
  res.status(201).json(row);
});

router.delete('/:resource/:id', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const { resource, id } = req.params;
  const tableMap = { inventory: 'inventory_logs', attendance: 'attendance_logs', payroll: 'payroll_records', shifts: 'shift_schedules' };
  const table = tableMap[resource];
  if (!table) return res.status(404).json({ error: 'Not found' });
  await db.run(`DELETE FROM ${table} WHERE id=?`, id);
  cache.delete(`${resource}_all`);
  res.json({ deleted: true, id });
});

router.get('/dashboard/summary', authenticate, requireRole(['Super Admin', 'Admin']), async (req, res) => {
  const db = await getDb();
  const cached = getCache('dashboard');
  if (cached) return res.json(cached);
  const today = new Date().toISOString().split('T')[0];
  
  const revResult = await db.get("SELECT SUM(total_amount) as total FROM orders WHERE created_at >= date('now')");
  const actStaff = await db.get("SELECT COUNT(*) as cnt FROM attendance_logs WHERE date=? AND status IN ('Active','On Break')", today);
  const pendingOrd = await db.get("SELECT COUNT(*) as cnt FROM transaction_ledger WHERE status='PENDING_PAYMENT' AND timestamp >= date('now')");
  
  const data = {
    today_revenue: revResult?.total || 0,
    active_staff: actStaff?.cnt || 0,
    pending_orders: pendingOrd?.cnt || 0
  };
  setCache('dashboard', data, 30);
  res.json(data);
});
module.exports = router;
